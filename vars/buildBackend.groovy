// vars/buildBackend.groovy
// Install deps and run tests for the Express backend

def call(Map config = [:]) {
    def workDir = config.get('dir', 'Backend')

    stage('Backend — Install & Test') {
        dir(workDir) {
            sh '''
                echo "📦 Installing backend dependencies …"
                npm install --prefer-offline --no-audit --no-fund
                echo "🧪 Running backend syntax check …"
                npm test
            '''
        }
    }
}

