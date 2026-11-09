// vars/cleanWorkspace.groovy
// Clean up Docker images and workspace after a build

def call(Map config = [:]) {
    def registry = config.get('registry', 'anurag181')
    def tag      = config.get('tag', "${env.BUILD_NUMBER}")

    stage('Cleanup') {
        sh """
            echo "🧹 Cleaning up local Docker images …"
            docker rmi ${registry}/nextgen-backend:${tag}  || true
            docker rmi ${registry}/nextgen-frontend:${tag} || true
            docker rmi ${registry}/nextgen-backend:latest   || true
            docker rmi ${registry}/nextgen-frontend:latest  || true
            docker image prune -f || true
        """
        cleanWs()
    }
}

