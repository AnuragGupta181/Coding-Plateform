// vars/trivyScan.groovy
// Scan Docker images for vulnerabilities using Trivy before pushing

def call(Map config = [:]) {
    def registry    = config.get('registry', 'anurag181')
    def tag         = config.get('tag', "${env.BUILD_NUMBER}")
    def severity    = config.get('severity', 'HIGH,CRITICAL')
    def exitCode    = config.get('failOnVulns', true) ? '1' : '0'
    def ignoreUnfixed = config.get('ignoreUnfixed', true)

    def backendImage  = "${registry}/nextgen-backend:${tag}"
    def frontendImage = "${registry}/nextgen-frontend:${tag}"

    def ignoreFlag = ignoreUnfixed ? '--ignore-unfixed' : ''

    stage('Trivy Vulnerability Scan') {
        // Install Trivy if not already available
        sh '''
            if ! command -v trivy &> /dev/null; then
                echo "📥 Installing Trivy …"
                curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin
            fi
            trivy --version
        '''

        // Scan backend image
        sh """
            echo "🔍 Scanning backend image: ${backendImage}"
            trivy image \
              --severity ${severity} \
              ${ignoreFlag} \
              --exit-code ${exitCode} \
              --format table \
              ${backendImage}
        """

        // Scan frontend image
        sh """
            echo "🔍 Scanning frontend image: ${frontendImage}"
            trivy image \
              --severity ${severity} \
              ${ignoreFlag} \
              --exit-code ${exitCode} \
              --format table \
              ${frontendImage}
        """

        echo "✅ Trivy scan complete — no ${severity} vulnerabilities found"
    }
}
