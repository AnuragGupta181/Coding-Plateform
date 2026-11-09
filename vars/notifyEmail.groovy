// vars/notifyEmail.groovy
// Send email notification on build success or failure

def call(Map config = [:]) {
    def recipients = config.get('to', 'nextgendeveloperteam@gmail.com')
    def status     = config.get('status', currentBuild.currentResult)

    def subject = "🔔 Jenkins Build ${status}: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
    def body = """
        <h2>Build ${status}</h2>
        <table>
            <tr><td><b>Job</b></td><td>${env.JOB_NAME}</td></tr>
            <tr><td><b>Build #</b></td><td>${env.BUILD_NUMBER}</td></tr>
            <tr><td><b>Branch</b></td><td>${env.GIT_BRANCH ?: 'N/A'}</td></tr>
            <tr><td><b>Commit</b></td><td>${env.GIT_COMMIT?.take(8) ?: 'N/A'}</td></tr>
            <tr><td><b>Duration</b></td><td>${currentBuild.durationString}</td></tr>
        </table>
        <p><a href="${env.BUILD_URL}">View Build</a> | <a href="${env.BUILD_URL}console">Console Output</a></p>
    """.stripIndent()

    emailext(
        to:       recipients,
        subject:  subject,
        body:     body,
        mimeType: 'text/html'
    )
}

