@Library('nextgen-shared-lib@main') _

pipeline {
    agent any

    triggers {
        githubPush()   // GitHub webhook trigger
    }

    environment {
        DOCKER_REGISTRY  = 'anurag181'
        SONAR_URL        = 'http://15.207.14.85:9000'
        VITE_API_BASE_URL= '/api'
        CD_REPO_URL      = 'https://github.com/AnuragGupta181/nextgen_cd.git'
        GIT_USER_NAME    = 'AnuragGupta181'
        GIT_USER_EMAIL   = 'nextgendeveloperteam@gmail.com'
        EMAIL_RECIPIENTS = 'nextgendeveloperteam@gmail.com'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Backend — Install & Test') {
            steps {
                buildBackend()
            }
        }

        stage('Frontend — Install & Build') {
            steps {
                buildFrontend()
            }
        }

        stage('SonarQube Analysis') {
            steps {
                sonarAnalysis(
                    sonarUrl:      env.SONAR_URL,
                    credentialsId: 'sonarqube1',
                    projectKey:    'coding-platform',
                    projectName:   'Coding Platform'
                )
            }
        }

        stage('Docker Build & Push') {
            steps {
                dockerBuildPush(
                    registry:     env.DOCKER_REGISTRY,
                    credentialId: 'docker-cred',
                    tag:          env.BUILD_NUMBER,
                    apiBaseUrl:   env.VITE_API_BASE_URL
                )
            }
        }

        stage('Trivy Vulnerability Scan') {
            steps {
                trivyScan(
                    registry:      env.DOCKER_REGISTRY,
                    tag:           env.BUILD_NUMBER,
                    severity:      'HIGH,CRITICAL',
                    failOnVulns:   false,
                    ignoreUnfixed: true
                )
            }
        }

        stage('Update K8s Manifest') {
            steps {
                updateK8sManifest(
                    gitRepoUrl:   env.CD_REPO_URL,
                    gitUserName:  env.GIT_USER_NAME,
                    gitUserEmail: env.GIT_USER_EMAIL,
                    credentialId: 'github',
                    registry:     env.DOCKER_REGISTRY,
                    tag:          env.BUILD_NUMBER
                )
            }
        }
    }

    post {
        success {
            notifyEmail(to: env.EMAIL_RECIPIENTS, status: 'SUCCESS')
        }
        failure {
            notifyEmail(to: env.EMAIL_RECIPIENTS, status: 'FAILURE')
        }
        always {
            cleanWorkspace(
                registry: env.DOCKER_REGISTRY,
                tag:      env.BUILD_NUMBER
            )
        }
    }
}
