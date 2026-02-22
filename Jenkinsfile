pipeline {
  agent any

  options {
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  environment {
    NODE_VERSION = '22'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Backend Install') {
      steps {
        dir('backend') {
          sh 'npm ci'
          sh 'npx prisma generate'
        }
      }
    }

    stage('Backend Build') {
      steps {
        dir('backend') {
          sh 'npm run build'
        }
      }
    }

    stage('Backend Test') {
      steps {
        dir('backend') {
          sh 'npm test -- --runInBand'
        }
      }
    }

    stage('Frontend Install') {
      steps {
        dir('frontend') {
          sh 'npm ci'
        }
      }
    }

    stage('Frontend Build') {
      steps {
        dir('frontend') {
          sh 'npm run build'
        }
      }
    }

    stage('Deploy') {
      when {
        branch 'main'
      }
      environment {
        RENDER_DEPLOY_HOOK_BACKEND = credentials('RENDER_DEPLOY_HOOK_BACKEND')
        RENDER_DEPLOY_HOOK_FRONTEND = credentials('RENDER_DEPLOY_HOOK_FRONTEND')
      }
      steps {
        sh 'curl -fsS -X POST "$RENDER_DEPLOY_HOOK_BACKEND"'
        sh 'curl -fsS -X POST "$RENDER_DEPLOY_HOOK_FRONTEND"'
      }
    }
  }

  post {
    always {
      deleteDir()
    }
  }
}
