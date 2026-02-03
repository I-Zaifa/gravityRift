class BounceGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('scoreValue');
        this.bestScoreElement = document.getElementById('bestScoreValue');
        this.finalScoreElement = document.getElementById('finalScore');
        this.startScreen = document.getElementById('startScreen');
        this.gameOverScreen = document.getElementById('gameOverScreen');
        this.startBtn = document.getElementById('startBtn');
        this.restartBtn = document.getElementById('restartBtn');
        
        this.setupCanvas();
        this.initializeGame();
        this.bindEvents();
        this.loadBestScore();
    }
    
    setupCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        
        // Handle resize
        window.addEventListener('resize', () => {
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
        });
    }
    
    initializeGame() {
        // Game state
        this.gameState = 'start'; // start, playing, gameOver
        this.score = 0;
        this.bestScore = 0;
        this.gameSpeed = 3;
        this.frameCount = 0;
        
        // Ball properties
        this.ball = {
            x: this.canvas.width * 0.2,
            y: this.canvas.height / 2,
            radius: 15,
            velocity: 0,
            gravity: 0.5,
            jumpPower: -10,
            color: '#4ecdc4',
            trail: []
        };
        
        // Obstacles
        this.obstacles = [];
        this.obstacleGap = 150;
        this.obstacleWidth = 60;
        this.lastObstacleX = this.canvas.width;
        
        // Particles
        this.particles = [];
        
        // Background elements
        this.stars = this.createStars();
    }
    
    createStars() {
        const stars = [];
        for (let i = 0; i < 50; i++) {
            stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2 + 1,
                speed: Math.random() * 0.5 + 0.1
            });
        }
        return stars;
    }
    
    bindEvents() {
        // Start button
        this.startBtn.addEventListener('click', () => this.startGame());
        
        // Restart button
        this.restartBtn.addEventListener('click', () => this.restartGame());
        
        // Game controls
        this.canvas.addEventListener('click', () => this.handleTap());
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleTap();
        });
        
        // Keyboard support
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && this.gameState === 'playing') {
                e.preventDefault();
                this.handleTap();
            }
        });
    }
    
    handleTap() {
        if (this.gameState === 'playing') {
            this.ball.velocity = this.ball.jumpPower;
            this.createJumpParticles();
        }
    }
    
    startGame() {
        this.gameState = 'playing';
        this.startScreen.classList.add('hidden');
        this.resetGame();
        this.gameLoop();
    }
    
    restartGame() {
        this.gameState = 'playing';
        this.gameOverScreen.classList.remove('active');
        this.resetGame();
        this.gameLoop();
    }
    
    resetGame() {
        this.score = 0;
        this.gameSpeed = 3;
        this.frameCount = 0;
        this.ball.x = this.canvas.width * 0.2;
        this.ball.y = this.canvas.height / 2;
        this.ball.velocity = 0;
        this.ball.trail = [];
        this.obstacles = [];
        this.lastObstacleX = this.canvas.width;
        this.particles = [];
        this.updateScore();
    }
    
    gameLoop() {
        if (this.gameState !== 'playing') return;
        
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update() {
        this.frameCount++;
        
        // Update ball physics
        this.ball.velocity += this.ball.gravity;
        this.ball.y += this.ball.velocity;
        
        // Update ball trail
        this.ball.trail.push({ x: this.ball.x, y: this.ball.y });
        if (this.ball.trail.length > 10) {
            this.ball.trail.shift();
        }
        
        // Keep ball in bounds
        if (this.ball.y - this.ball.radius < 0) {
            this.ball.y = this.ball.radius;
            this.ball.velocity = 0;
        }
        if (this.ball.y + this.ball.radius > this.canvas.height) {
            this.ball.y = this.canvas.height - this.ball.radius;
            this.ball.velocity = 0;
        }
        
        // Update obstacles
        this.updateObstacles();
        
        // Update particles
        this.updateParticles();
        
        // Update stars
        this.updateStars();
        
        // Check collisions
        this.checkCollisions();
        
        // Increase difficulty
        if (this.frameCount % 600 === 0) {
            this.gameSpeed += 0.5;
        }
    }
    
    updateObstacles() {
        // Move obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            this.obstacles[i].x -= this.gameSpeed;
            
            // Remove off-screen obstacles
            if (this.obstacles[i].x + this.obstacleWidth < 0) {
                this.obstacles.splice(i, 1);
                this.score++;
                this.updateScore();
                this.createScoreParticles();
            }
        }
        
        // Create new obstacles
        if (this.obstacles.length === 0 || this.obstacles[this.obstacles.length - 1].x < this.canvas.width - 300) {
            this.createObstacle();
        }
    }
    
    createObstacle() {
        const gapY = Math.random() * (this.canvas.height - this.obstacleGap - 100) + 50;
        
        this.obstacles.push({
            x: this.canvas.width,
            gapY: gapY,
            passed: false,
            color: `hsl(${Math.random() * 60 + 280}, 70%, 50%)`
        });
    }
    
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= 0.02;
            particle.vy += 0.1;
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    updateStars() {
        this.stars.forEach(star => {
            star.x -= star.speed;
            if (star.x < 0) {
                star.x = this.canvas.width;
                star.y = Math.random() * this.canvas.height;
            }
        });
    }
    
    checkCollisions() {
        for (const obstacle of this.obstacles) {
            // Check if ball is within obstacle x range
            if (this.ball.x + this.ball.radius > obstacle.x && 
                this.ball.x - this.ball.radius < obstacle.x + this.obstacleWidth) {
                
                // Check if ball hits top or bottom obstacle
                if (this.ball.y - this.ball.radius < obstacle.gapY || 
                    this.ball.y + this.ball.radius > obstacle.gapY + this.obstacleGap) {
                    this.gameOver();
                    return;
                }
            }
        }
    }
    
    createJumpParticles() {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: this.ball.x,
                y: this.ball.y,
                vx: Math.random() * 4 - 2,
                vy: Math.random() * 4 - 2,
                life: 1,
                color: this.ball.color
            });
        }
    }
    
    createScoreParticles() {
        for (let i = 0; i < 12; i++) {
            this.particles.push({
                x: this.canvas.width / 2,
                y: 50,
                vx: Math.random() * 6 - 3,
                vy: Math.random() * 2 + 1,
                life: 1,
                color: '#ffd700'
            });
        }
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#0a0a0f';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw stars
        this.drawStars();
        
        // Draw ball trail
        this.drawBallTrail();
        
        // Draw obstacles
        this.drawObstacles();
        
        // Draw ball
        this.drawBall();
        
        // Draw particles
        this.drawParticles();
    }
    
    drawStars() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.stars.forEach(star => {
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    drawBallTrail() {
        this.ball.trail.forEach((point, index) => {
            this.ctx.fillStyle = `rgba(78, 205, 196, ${index / this.ball.trail.length * 0.5})`;
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, this.ball.radius * (index / this.ball.trail.length), 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    drawBall() {
        // Ball glow effect
        const gradient = this.ctx.createRadialGradient(
            this.ball.x, this.ball.y, 0,
            this.ball.x, this.ball.y, this.ball.radius * 2
        );
        gradient.addColorStop(0, 'rgba(78, 205, 196, 0.8)');
        gradient.addColorStop(1, 'rgba(78, 205, 196, 0)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius * 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Main ball
        this.ctx.fillStyle = this.ball.color;
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Ball highlight
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x - 5, this.ball.y - 5, this.ball.radius / 3, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawObstacles() {
        this.obstacles.forEach(obstacle => {
            // Obstacle glow
            this.ctx.shadowColor = obstacle.color;
            this.ctx.shadowBlur = 20;
            
            // Top obstacle
            const topGradient = this.ctx.createLinearGradient(
                obstacle.x, 0, obstacle.x + this.obstacleWidth, 0
            );
            topGradient.addColorStop(0, obstacle.color);
            topGradient.addColorStop(0.5, this.adjustColor(obstacle.color, 20));
            topGradient.addColorStop(1, obstacle.color);
            
            this.ctx.fillStyle = topGradient;
            this.ctx.fillRect(obstacle.x, 0, this.obstacleWidth, obstacle.gapY);
            
            // Bottom obstacle
            this.ctx.fillRect(
                obstacle.x, 
                obstacle.gapY + this.obstacleGap, 
                this.obstacleWidth, 
                this.canvas.height - obstacle.gapY - this.obstacleGap
            );
            
            this.ctx.shadowBlur = 0;
        });
    }
    
    drawParticles() {
        this.particles.forEach(particle => {
            this.ctx.fillStyle = `${particle.color}${Math.floor(particle.life * 255).toString(16).padStart(2, '0')}`;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    adjustColor(color, amount) {
        const num = parseInt(color.replace('#', ''), 16);
        const r = Math.min(255, ((num >> 16) & 255) + amount);
        const g = Math.min(255, ((num >> 8) & 255) + amount);
        const b = Math.min(255, (num & 255) + amount);
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }
    
    updateScore() {
        this.scoreElement.textContent = this.score;
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        this.finalScoreElement.textContent = this.score;
        
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            this.bestScoreElement.textContent = this.bestScore;
            this.saveBestScore();
        }
        
        setTimeout(() => {
            this.gameOverScreen.classList.add('active');
        }, 500);
    }
    
    loadBestScore() {
        const saved = localStorage.getItem('bounceGameBestScore');
        if (saved) {
            this.bestScore = parseInt(saved);
            this.bestScoreElement.textContent = this.bestScore;
        }
    }
    
    saveBestScore() {
        localStorage.setItem('bounceGameBestScore', this.bestScore.toString());
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    new BounceGame();
});

// Prevent scrolling on mobile
document.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });
