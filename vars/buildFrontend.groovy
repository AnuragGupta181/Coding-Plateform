// vars/buildFrontend.groovy
// Install deps and build the React/Vite frontend

def call(Map config = [:]) {
    def workDir = config.get('dir', 'frontend')

    stage('Frontend — Install & Build') {
        dir(workDir) {
            sh '''
                echo "📦 Installing frontend dependencies …"
                npm install --prefer-offline --no-audit --no-fund
                echo "🔨 Building frontend …"
                npm run build
            '''
        }
    }
}

