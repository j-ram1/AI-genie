import { BadRequestException } from '@nestjs/common';

const ID_PATTERN = /^[a-z0-9]{8,64}$/;
const THEME_PATTERN = /^[A-Za-z0-9_-]{2,64}$/;
const PHONE_PATTERN = /^\+[1-9]\d{4,14}$/;

export function requireTrimmedString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new BadRequestException(`${field} must be a string`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new BadRequestException(`${field} is required`);
  }
  return trimmed;
}

export function validateId(value: unknown, field: string): string {
  const id = requireTrimmedString(value, field);
  if (!ID_PATTERN.test(id)) {
    throw new BadRequestException(`Invalid ${field}`);
  }
  return id;
}

export function validateThemeId(value: unknown): string {
  const themeId = requireTrimmedString(value, 'theme_id');
  if (!THEME_PATTERN.test(themeId)) {
    throw new BadRequestException('Invalid theme_id');
  }
  return themeId;
}

export function validatePhone(value: unknown): string {
  const phone = requireTrimmedString(value, 'phone');
  if (!PHONE_PATTERN.test(phone)) {
    throw new BadRequestException(
      'Invalid phone format. Use + followed by 5 to 15 digits.',
    );
  }
  return phone;
}

export function validateDigit(value: unknown): number {
  if (!Number.isInteger(value)) {
    throw new BadRequestException('digit must be an integer');
  }
  const digit = Number(value);
  if (digit < 0 || digit > 9) {
    throw new BadRequestException('digit must be between 0 and 9');
  }
  return digit;
}

export function validateGuessText(value: unknown): string {
  const text = requireTrimmedString(value, 'text').replace(/\s+/g, ' ');
  if (text.length > 80) {
    throw new BadRequestException('Guess must be 80 characters or less');
  }
  return text;
}
