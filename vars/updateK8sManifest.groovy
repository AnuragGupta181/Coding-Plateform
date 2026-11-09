// vars/updateK8sManifest.groovy
// Update the K8s deployment manifests in the GitOps (CD) repo with the new image tags

def call(Map config = [:]) {
    def gitRepoUrl   = config.get('gitRepoUrl')      // e.g. https://github.com/AnuragGupta181/nextgen_cd.git
    def gitUserName  = config.get('gitUserName', 'AnuragGupta181')
    def gitUserEmail = config.get('gitUserEmail', 'nextgendeveloperteam@gmail.com')
    def credentialId = config.get('credentialId', 'github')
    def registry     = config.get('registry', 'anurag181')
    def tag          = config.get('tag', "${env.BUILD_NUMBER}")
    def branch       = config.get('branch', 'main')

    // Derive repo name from URL
    def repoName = gitRepoUrl.tokenize('/').last().replace('.git', '')

    stage('Update K8s Manifest') {
        withCredentials([string(credentialsId: credentialId, variable: 'GITHUB_TOKEN')]) {
            sh "rm -rf _cd_repo"
            dir('_cd_repo') {
                sh """
                    export GIT_TERMINAL_PROMPT=0

                    # Clone the CD repo using username:token authentication
                    git clone https://${gitUserName}:\$GITHUB_TOKEN@github.com/${gitUserName}/${repoName}.git .
                    git checkout ${branch} || git checkout -b ${branch}

                    git config user.email "${gitUserEmail}"
                    git config user.name  "${gitUserName}"

                    echo "📝 Updating image tags → build #${tag}"

                    # Update backend deployment image
                    sed -i 's|image: ${registry}/nextgen-backend:.*|image: ${registry}/nextgen-backend:${tag}|g' k8s/deploy.yml

                    # Update frontend deployment image
                    sed -i 's|image: ${registry}/nextgen-frontend:.*|image: ${registry}/nextgen-frontend:${tag}|g' k8s/frontend-deploy.yml

                    git add k8s/deploy.yml k8s/frontend-deploy.yml
                    git diff --cached --quiet && echo "No changes to commit" && exit 0

                    git commit -m "ci: update backend & frontend images to build #${tag}"
                    git push https://${gitUserName}:\$GITHUB_TOKEN@github.com/${gitUserName}/${repoName}.git HEAD:${branch}
                """
            }
        }
        echo "✅ CD repo updated — ArgoCD will pick up the change"
    }
}
