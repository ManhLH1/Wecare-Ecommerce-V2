pipeline {
    agent any
    
    environment {
        APP_NAME = 'wecare-ecommerce'
        DOCKER_IMAGE = 'wecare-ecommerce'
        DOCKER_TAG = "${BUILD_NUMBER}"
        VPS_HOST = "20.127.187.150"
        VPS_USER = 'root'
        DEPLOY_PATH = '/home/wecare/wecare-v2/Wecare-Ecommerce-V2'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                echo "Checked out branch: ${env.GIT_BRANCH}"
            }
        }
        
        stage('Build Docker Image') {
            steps {
                echo 'Building Docker image...'
                script {
                    sh """
                        docker build -t ${DOCKER_IMAGE}:${DOCKER_TAG} .
                        docker tag ${DOCKER_IMAGE}:${DOCKER_TAG} ${DOCKER_IMAGE}:latest
                    """
                }
            }
        }
        
        stage('Save Docker Image') {
            steps {
                echo 'Saving Docker image...'
                sh """
                    docker save ${DOCKER_IMAGE}:latest | gzip > ${DOCKER_IMAGE}.tar.gz
                """
            }
        }
        
        stage('Deploy to VPS') {
            steps {
                echo 'Deploying to VPS...'
                sshagent(credentials: ['37e445c2-5b34-467d-b14a-fcb94385dd57']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} 'mkdir -p ${DEPLOY_PATH}'
                        
                        scp -o StrictHostKeyChecking=no ${DOCKER_IMAGE}.tar.gz ${VPS_USER}@${VPS_HOST}:${DEPLOY_PATH}/
                        scp -o StrictHostKeyChecking=no docker-compose.yml ${VPS_USER}@${VPS_HOST}:${DEPLOY_PATH}/
                        scp -o StrictHostKeyChecking=no .env ${VPS_USER}@${VPS_HOST}:${DEPLOY_PATH}/
                        
                        ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} '
                            cd ${DEPLOY_PATH}
                            gunzip -c ${DOCKER_IMAGE}.tar.gz | docker load
                            docker-compose down || true
                            docker-compose up -d
                            rm -f ${DOCKER_IMAGE}.tar.gz
                            docker image prune -f
                        '
                    """
                }
            }
        }
        
        stage('Health Check') {
            steps {
                script {
                    sleep 30
                    sh "curl -f http://${VPS_HOST}:3000 || echo 'Health check warning'"
                }
            }
        }
        
        stage('Cleanup') {
            steps {
                sh """
                    rm -f ${DOCKER_IMAGE}.tar.gz
                    docker rmi ${DOCKER_IMAGE}:${DOCKER_TAG} || true
                """
            }
        }
    }
    
    post {
        success {
            echo 'Deployment successful!'
        }
        failure {
            echo 'Deployment failed!'
        }
        always {
            deleteDir()
        }
    }
}
