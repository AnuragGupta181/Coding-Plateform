// vars/sonarAnalysis.groovy
// Run SonarQube static code analysis with optional Quality Gate enforcement

def call(Map config = [:]) {
    def sonarUrl       = config.get('sonarUrl', 'http://15.207.14.85:9000')
    def credentialsId  = config.get('credentialsId', 'sonarqube1')
    def projectKey     = config.get('projectKey', 'coding-platform')
    def projectName    = config.get('projectName', 'Coding Platform')
    def sources        = config.get('sources', 'Backend,frontend/src')
    def exclusions     = config.get('exclusions', '**/node_modules/**,**/dist/**,**/build/**,**/*.test.*')
    def waitForGate    = config.get('waitForGate', false)
    def gateTimeout    = config.get('gateTimeout', 5)

    stage('SonarQube Analysis') {
        withCredentials([string(credentialsId: credentialsId, variable: 'SONAR_AUTH_TOKEN')]) {
            sh """
                # Locate sonar-scanner in standard paths or PATH
                SCANNER_BIN="sonar-scanner"
                if ! command -v \$SCANNER_BIN &> /dev/null; then
                    if [ -f "/opt/sonar-scanner/bin/sonar-scanner" ]; then
                        SCANNER_BIN="/opt/sonar-scanner/bin/sonar-scanner"
                    elif [ -f "/opt/sonar-scanner-5.0.1.3006-linux/bin/sonar-scanner" ]; then
                        SCANNER_BIN="/opt/sonar-scanner-5.0.1.3006-linux/bin/sonar-scanner"
                    elif [ -f "\$HOME/.sonar-scanner/bin/sonar-scanner" ]; then
                        SCANNER_BIN="\$HOME/.sonar-scanner/bin/sonar-scanner"
                    fi
                fi

                echo "🔍 Running SonarQube analysis using \$SCANNER_BIN …"
                \$SCANNER_BIN \
                  -Dsonar.projectKey=${projectKey} \
                  -Dsonar.projectName='${projectName}' \
                  -Dsonar.sources=${sources} \
                  -Dsonar.exclusions='${exclusions}' \
                  -Dsonar.host.url=${sonarUrl} \
                  -Dsonar.login=\$SONAR_AUTH_TOKEN
            """
        }
    }

    if (waitForGate) {
        stage('SonarQube Quality Gate') {
            timeout(time: gateTimeout, unit: 'MINUTES') {
                def qg = waitForQualityGate()
                if (qg.status != 'OK') {
                    error "❌ Pipeline aborted — SonarQube Quality Gate FAILED: ${qg.status}"
                }
                echo "✅ SonarQube Quality Gate passed: ${qg.status}"
            }
        }
    }
}
