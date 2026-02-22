import { Injectable } from '@nestjs/common';

type CounterKey = string;
type HistogramKey = string;

@Injectable()
export class MetricsService {
  private readonly startTime = Date.now();

  private readonly requestCounters = new Map<CounterKey, number>();
  private readonly durationSums = new Map<HistogramKey, number>();
  private readonly durationCounts = new Map<HistogramKey, number>();
  private readonly durationBuckets = new Map<HistogramKey, number[]>();

  private readonly bucketBounds = [
    0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
  ];

  private key(labels: Record<string, string | number>) {
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('|');
  }

  observeHttp(params: {
    method: string;
    route: string;
    status: number;
    durationSeconds: number;
  }) {
    const labels = {
      method: params.method.toUpperCase(),
      route: params.route,
      status: String(params.status),
    };
    const key = this.key(labels);

    this.requestCounters.set(key, (this.requestCounters.get(key) ?? 0) + 1);
    this.durationSums.set(
      key,
      (this.durationSums.get(key) ?? 0) + params.durationSeconds,
    );
    this.durationCounts.set(key, (this.durationCounts.get(key) ?? 0) + 1);

    const bucketCounts =
      this.durationBuckets.get(key) ??
      Array.from({ length: this.bucketBounds.length + 1 }, () => 0);

    let bucketIdx = this.bucketBounds.findIndex(
      (bound) => params.durationSeconds <= bound,
    );
    if (bucketIdx === -1) bucketIdx = this.bucketBounds.length;
    bucketCounts[bucketIdx] += 1;
    this.durationBuckets.set(key, bucketCounts);
  }

  private parseKey(key: string): Record<string, string> {
    const out: Record<string, string> = {};
    key.split('|').forEach((pair) => {
      const [k, v] = pair.split('=');
      out[k] = v;
    });
    return out;
  }

  private formatLabels(labels: Record<string, string>) {
    const parts = Object.entries(labels).map(
      ([k, v]) => `${k}="${v.replace(/"/g, '\\"')}"`,
    );
    return `{${parts.join(',')}}`;
  }

  renderPrometheusMetrics() {
    const lines: string[] = [];

    lines.push('# HELP process_uptime_seconds Uptime of the process in seconds.');
    lines.push('# TYPE process_uptime_seconds gauge');
    lines.push(`process_uptime_seconds ${(Date.now() - this.startTime) / 1000}`);

    lines.push('# HELP http_requests_total Total HTTP requests processed.');
    lines.push('# TYPE http_requests_total counter');
    this.requestCounters.forEach((value, key) => {
      const labels = this.parseKey(key);
      lines.push(`http_requests_total${this.formatLabels(labels)} ${value}`);
    });

    lines.push(
      '# HELP http_request_duration_seconds HTTP request duration in seconds.',
    );
    lines.push('# TYPE http_request_duration_seconds histogram');
    this.durationBuckets.forEach((bucketCounts, key) => {
      const labels = this.parseKey(key);
      let cumulative = 0;
      for (let i = 0; i < bucketCounts.length; i++) {
        cumulative += bucketCounts[i];
        const le =
          i < this.bucketBounds.length
            ? String(this.bucketBounds[i])
            : '+Inf';
        lines.push(
          `http_request_duration_seconds_bucket${this.formatLabels({ ...labels, le })} ${cumulative}`,
        );
      }
      lines.push(
        `http_request_duration_seconds_sum${this.formatLabels(labels)} ${this.durationSums.get(key) ?? 0}`,
      );
      lines.push(
        `http_request_duration_seconds_count${this.formatLabels(labels)} ${this.durationCounts.get(key) ?? 0}`,
      );
    });

    lines.push('');
    return lines.join('\n');
  }
}
