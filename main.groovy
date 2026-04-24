
pipeline {
    agent none
    parameters {
        string(name: 'BRANCH_NAME', defaultValue: 'dev4_EnE2.5', description: 'Select your Branch')
        string(name: 'INSTANCE_NAME', defaultValue: 'console', description: 'Name your Instance Name')
        choice(name: 'SYSTEM_LABEL', choices: ['vs24','Japan-AHEAD-QA'], description: 'Select your Agent node')
        choice(name: 'REPOSITORY_PATH', choices: ['C:\\VINOTH\\1-Honda\\ARAS_JENKINS','C:\\VINOTH\\1-Honda\\ARASBUILD'], description: 'Update your Repo Path')
        choice(name: 'POST_DEPLOYMENT_PATH', choices: ['C:\\VINOTH\\1-Honda\\aras-jenkins'], description: 'Update Post Deployement Script Path')

        string(name: 'DB_USER', defaultValue: 'sa', description: 'Database UserName?')
        string(name: 'DB_PASS', defaultValue: 'innovator', description: 'Database Password?')
        choice(name: 'DB_HOST', choices: ['LIN-FX1NBK3\\SQLSERVER',"(local)"], description: 'Select your Server')
    }
    stages {
        stage('🔨 Aras Builder') {
            agent {
                node {
                    label params.SYSTEM_LABEL
                    customWorkspace params.REPOSITORY_PATH
                }
            }
            steps {
                script {
                    echo "🔍 Finding the Workspace..."
                    if (!fileExists(params.REPOSITORY_PATH)) {
                        error "❌ Workspace path does NOT exist: ${params.REPOSITORY_PATH}"
                    } else {
                        echo "✅ Workspace path exists: ${params.REPOSITORY_PATH}"
                    }
                    echo "Branch Checkout / Create (Instance Name)"
                    echo "🔨 Fetching latest refs from origin..."
                    bat 'git fetch origin'
                    echo "🔍 Checking if branch exists on origin: ${params.BRANCH_NAME}"
                    def originStatus = bat(
                        script: "git show-ref --verify --quiet refs/remotes/origin/%BRANCH_NAME%",
                        returnStatus: true
                    )
                    if (originStatus != 0) {
                        error "❌ Branch '${params.BRANCH_NAME}' does NOT exist on origin"
                    }
                    echo "✅ Origin branch exists"
                    echo "🔍 Checking if local branch exists: ${params.INSTANCE_NAME}"
                    def localStatus = bat(
                        script: "git show-ref --verify --quiet refs/heads/%INSTANCE_NAME%",
                        returnStatus: true
                    )
                    if (localStatus == 0) {
                        echo "✅ Instance Local branch exists"
                        echo "📌 Checking out local branch..."
                        bat 'git checkout %INSTANCE_NAME%'
                        echo "🔄 Pulling latest changes from origin..."
                        bat 'git pull origin %BRANCH_NAME%'

                    } else {
                        echo "ℹ️ Instance Local branch does not exist"
                        echo "🌱 Creating local branch from origin..."
                        bat 'git checkout -b %INSTANCE_NAME% origin/%BRANCH_NAME%'
                    }
                    echo "✅ Branch '${params.INSTANCE_NAME}' is ready"
                    echo '🚀 Starting build process'
                    echo '▶️ Running BuildAndDeploy.ps1'
                    // powershell '.\\BuildAndDeploy.ps1 -UpdateInstance -SkipPrerequisites'
                    // powershell '.\\BuildAndDeploy.ps1'
                    // powershell '.\\runner.ps1'
                    echo '✅ Build script execution finished'
                }
            }
        }
        stage('🔨 Post Deployment Scripts') {
            agent {
                node {
                    label params.SYSTEM_LABEL
                    customWorkspace params.POST_DEPLOYMENT_PATH
                }
            }
            steps {
                script {
                    if (!fileExists(params.POST_DEPLOYMENT_PATH)) {
                        error "❌ Workspace path does NOT exist: ${params.POST_DEPLOYMENT_PATH}"
                    } else {
                        echo "✅ Workspace path exists: ${params.POST_DEPLOYMENT_PATH}"
                    }

                    echo "Assigning the variables.."
                    def getSystemName = bat(script: "@echo off & hostname",returnStdout: true).trim()
                    env.SYSTEM_NAME = getSystemName
                    echo "System Name : ${env.SYSTEM_NAME}"

                    echo "🔍 Starting database connection test..."
                    bat """
                        @echo on
                        sqlcmd ^
                        -S ${params.DB_HOST} ^
                        -d ${env.SYSTEM_NAME}-HONDA-${params.INSTANCE_NAME} ^
                        -U ${params.DB_USER} ^
                        -P "${params.DB_PASS}" ^
                        -Q "SET NOCOUNT ON; SELECT 'SQL connection OK' AS status;" ^
                        -b -V16
                    """
                    echo "✅ Database connection successful"

                    echo "✅ Start building and Importing.."
                    bat("node index.js ${params.DB_HOST} ${env.SYSTEM_NAME}-HONDA-${params.INSTANCE_NAME} ${params.DB_USER} ${params.DB_PASS}")                    
                    echo "✅ Completed"
                }
            }
        }
    }
}