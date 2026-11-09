// vars/trivyScan.groovy
// Scan Docker images for vulnerabilities using Trivy before pushing

def call(Map config = [:]) {
    def registry    = config.get('registry', 'anurag181')
    def tag         = config.get('tag', "${env.BUILD_NUMBER}")
    def severity    = config.get('severity', 'HIGH,CRITICAL')
    def failOnVulns = config.get('failOnVulns', false)
    def exitCode    = failOnVulns ? '1' : '0'
    def ignoreUnfixed = config.get('ignoreUnfixed', true)

    def backendImage  = "${registry}/nextgen-backend:${tag}"
    def frontendImage = "${registry}/nextgen-frontend:${tag}"

    def ignoreFlag = ignoreUnfixed ? '--ignore-unfixed' : ''

    stage('Trivy Vulnerability Scan') {
        // Ensure Trivy is available (POSIX compliant check + fallback to user local bin)
        sh '''
            export PATH="\$HOME/.local/bin:/usr/local/bin:/usr/bin:\$PATH"
            if ! command -v trivy >/dev/null 2>&1; then
                echo "📥 Installing Trivy to user local bin …"
                mkdir -p "\$HOME/.local/bin"
                curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b "\$HOME/.local/bin"
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

