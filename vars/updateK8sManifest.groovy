// vars/updateK8sManifest.groovy
// Update the K8s deployment manifest in the GitOps (CD) repo with the new image tag

def call(Map config = [:]) {
    def gitRepoUrl   = config.get('gitRepoUrl')      // e.g. https://github.com/AnuragGupta181/nextgen_cd.git
    def gitUserName  = config.get('gitUserName', 'AnuragGupta181')
    def gitUserEmail = config.get('gitUserEmail', 'nextgendeveloperteam@gmail.com')
    def credentialId = config.get('credentialId', 'github')
    def registry     = config.get('registry', 'anurag181')
    def tag          = config.get('tag', "${env.BUILD_NUMBER}")
    def manifestPath = config.get('manifestPath', 'k8s/deploy.yml')
    def branch       = config.get('branch', 'main')

    stage('Update K8s Manifest') {
        withCredentials([string(credentialsId: credentialId, variable: 'GITHUB_TOKEN')]) {
            dir('_cd_repo') {
                sh """
                    # Clone the CD repo
                    git clone https://\$GITHUB_TOKEN@github.com/${gitUserName}/${gitRepoUrl.tokenize('/').last().replace('.git', '')}.git . || true
                    git checkout ${branch} || git checkout -b ${branch}

                    git config user.email "${gitUserEmail}"
                    git config user.name  "${gitUserName}"

                    echo "📝 Updating image tags in ${manifestPath} → tag ${tag}"

                    # Update backend image
                    sed -i 's|image: .*nextgen-backend:.*|image: ${registry}/nextgen-backend:${tag}|g' ${manifestPath}

                    # Check if there's a frontend deploy manifest too
                    if grep -q 'nextgen-frontend' ${manifestPath}; then
                        sed -i 's|image: .*nextgen-frontend:.*|image: ${registry}/nextgen-frontend:${tag}|g' ${manifestPath}
                    fi

                    git add ${manifestPath}
                    git diff --cached --quiet && echo "No changes to commit" && exit 0

                    git commit -m "ci: update images to build #${tag}"
                    git push https://\$GITHUB_TOKEN@github.com/${gitUserName}/${gitRepoUrl.tokenize('/').last().replace('.git', '')}.git HEAD:${branch}
                """
            }
        }
        echo "✅ CD repo updated — ArgoCD will pick up the change"
    }
}

