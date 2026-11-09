// vars/dockerBuildPush.groovy
// Build Docker images on the EC2 agent and push to DockerHub

def call(Map config = [:]) {
    def registry     = config.get('registry', 'anurag181')
    def credentialId = config.get('credentialId', 'docker-cred')
    def tag          = config.get('tag', "${env.BUILD_NUMBER}")
    def apiBaseUrl   = config.get('apiBaseUrl', env.VITE_API_BASE_URL ?: '/api')

    def backendImage  = "${registry}/nextgen-backend:${tag}"
    def frontendImage = "${registry}/nextgen-frontend:${tag}"
    def latestBackend  = "${registry}/nextgen-backend:latest"
    def latestFrontend = "${registry}/nextgen-frontend:latest"

    stage('Docker Build & Push') {
        withCredentials([usernamePassword(
            credentialsId: credentialId,
            usernameVariable: 'DOCKER_USER',
            passwordVariable: 'DOCKER_PASS'
        )]) {
            sh 'echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin'
        }

        // ── Backend image ──
        dir('Backend') {
            sh """
                echo "🐳 Building backend image: ${backendImage}"
                docker build -t ${backendImage} -t ${latestBackend} .
                docker push ${backendImage}
                docker push ${latestBackend}
            """
        }

        // ── Frontend image ──
        dir('frontend') {
            sh """
                echo "🐳 Building frontend image: ${frontendImage} with VITE_API_BASE_URL=${apiBaseUrl}"
                docker build \
                  --build-arg VITE_API_BASE_URL=${apiBaseUrl} \
                  -t ${frontendImage} -t ${latestFrontend} .
                docker push ${frontendImage}
                docker push ${latestFrontend}
            """
        }

        sh 'docker logout'
        echo "✅ Pushed: ${backendImage}, ${frontendImage}"
    }
}
