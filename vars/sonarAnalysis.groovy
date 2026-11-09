// vars/sonarAnalysis.groovy
// Run SonarQube static code analysis on both backend and frontend

def call(Map config = [:]) {
    def sonarUrl       = config.get('sonarUrl', 'http://15.207.14.85:9000')
    def credentialsId  = config.get('credentialsId', 'sonarqube')
    def projectKey     = config.get('projectKey', 'coding-platform')
    def projectName    = config.get('projectName', 'Coding Platform')
    def sources        = config.get('sources', 'Backend,frontend/src')
    def exclusions     = config.get('exclusions', '**/node_modules/**,**/dist/**,**/build/**,**/*.test.*')

    stage('SonarQube Analysis') {
        withCredentials([string(credentialsId: credentialsId, variable: 'SONAR_AUTH_TOKEN')]) {
            sh """
                echo "🔍 Running SonarQube analysis …"
                sonar-scanner \
                  -Dsonar.projectKey=${projectKey} \
                  -Dsonar.projectName='${projectName}' \
                  -Dsonar.sources=${sources} \
                  -Dsonar.exclusions='${exclusions}' \
                  -Dsonar.host.url=${sonarUrl} \
                  -Dsonar.login=\$SONAR_AUTH_TOKEN
            """
        }
    }
}

