// vars/checkout.groovy
// Checkout source code from SCM (GitHub webhook trigger already provides the code)

def call() {
    stage('Checkout') {
        checkout scm
        sh 'echo "✅ Checkout complete — branch: ${GIT_BRANCH}, commit: ${GIT_COMMIT}"'
    }
}

