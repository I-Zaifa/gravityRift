class GravityRift {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('scoreValue');
        this.comboElement = document.getElementById('comboValue');
        this.bestScoreElement = document.getElementById('bestScoreValue');
        this.speedElement = document.getElementById('speedValue');
        this.stabilityElement = document.getElementById('stabilityValue');
        this.finalScoreElement = document.getElementById('finalScore');
        this.finalBestScoreElement = document.getElementById('finalBestScore');
        this.streakBanner = document.getElementById('streakBanner');
        this.startScreen = document.getElementById('startScreen');
        this.gameOverScreen = document.getElementById('gameOverScreen');
        this.startBtn = document.getElementById('startBtn');
        this.restartBtn = document.getElementById('restartBtn');
        this.gameContainer = document.getElementById('gameContainer');
        this.installBtn = document.getElementById('installBtn');
        this.installModal = document.getElementById('installModal');
        this.installConfirm = document.getElementById('installConfirm');
        this.installClose = document.getElementById('installClose');
        this.installCaption = document.getElementById('installCaption');
        this.installPrompt = null;
        this.isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
        this.isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone === true;

        this.resizeCanvas();
        this.initializeGame();
        this.bindEvents();
        this.loadBestScore();
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const dpr = window.devicePixelRatio || 1;
        const prevHeight = this.height || container.clientHeight;

        this.width = container.clientWidth;
        this.height = container.clientHeight;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        if (this.ball) {
            const ratio = prevHeight ? this.ball.y / prevHeight : 0.5;
            this.ball.x = this.width * 0.25;
            this.ball.y = ratio * this.height;
        }

        this.stars = this.createStars();
    }

    initializeGame() {
        this.gameState = 'start';
        this.score = 0;
        this.bestScore = 0;
        this.combo = 1;
        this.perfectStreak = 0;
        this.healthStreakGoal = 5;
        this.maxCombo = 6;
        this.perfectWindow = 32;
        this.frameCount = 0;
        this.endTimer = 0;
        this.lastFrameTime = null;
        this.trailTimer = 0;
        this.maxStability = 25;
        this.stability = this.maxStability;
        this.invulnerableTimer = 0;
        this.gracePeriod = 200;

        this.baseSpeed = 2.7;
        this.speedMultiplier = 1;
        this.gameSpeed = this.baseSpeed;

        this.baseGap = 240;
        this.minGap = 175;
        this.currentGap = this.baseGap;

        this.obstacleWidth = 80;
        this.obstacleSpacing = 480;
        this.nextObstacleSpacing = 480;
        this.edgeBuffer = 16;

        this.gravityBase = 0.4;
        this.flipImpulse = 8.4;
        this.gravityDirection = 1;
        this.velocityClamp = 8.6;
        this.velocityDamp = 0.988;

        this.ball = {
            x: this.width * 0.25,
            y: this.height * 0.5,
            radius: 13,
            velocity: 0,
            color: '#23f5d3',
            trail: []
        };

        this.obstacles = [];
        this.shards = [];
        this.particles = [];
        this.streakTimer = 0;
        this.nextShardTimer = 180;
        this.obstaclePalette = ['#23f5d3', '#ff7a59', '#7c5cff', '#ffd166'];

        this.stars = this.createStars();
        this.updateHud();
    }

    createStars() {
        const stars = [];
        const total = 70;
        for (let i = 0; i < total; i++) {
            stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 0.6 + 0.2,
                alpha: Math.random() * 0.6 + 0.3
            });
        }
        return stars;
    }

    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startGame());
        this.restartBtn.addEventListener('click', () => this.restartGame());
        this.installBtn.addEventListener('click', () => this.openInstallModal());
        this.installConfirm.addEventListener('click', () => this.triggerInstall());
        this.installClose.addEventListener('click', () => this.closeInstallModal());

        this.canvas.addEventListener('pointerdown', (event) => {
            if (event.pointerType === 'mouse' && event.button !== 0) {
                return;
            }
            this.handleTap();
        });

        document.addEventListener('keydown', (event) => {
            if (event.code === 'Space') {
                event.preventDefault();
                this.handleTap();
            }
        });

        window.addEventListener('resize', () => this.resizeCanvas());
        window.addEventListener('beforeinstallprompt', (event) => {
            event.preventDefault();
            this.installPrompt = event;
            this.showInstallButton();
        });

        window.addEventListener('appinstalled', () => {
            this.isStandalone = true;
            this.hideInstallButton();
            this.closeInstallModal();
        });

        if (this.isIOS && !this.isStandalone) {
            this.showInstallButton();
        }
    }

    handleTap() {
        if (this.gameState === 'start') {
            this.startGame();
            return;
        }

        if (this.gameState === 'gameOver') {
            this.restartGame();
            return;
        }

        if (this.gameState !== 'playing') {
            return;
        }

        this.gravityDirection *= -1;
        this.ball.velocity = this.ball.velocity * 0.2 + this.flipImpulse * this.gravityDirection;
        this.createFlipParticles();
    }

    showInstallButton() {
        if (!this.installBtn) {
            return;
        }
        this.installBtn.classList.add('visible');
    }

    hideInstallButton() {
        if (!this.installBtn) {
            return;
        }
        this.installBtn.classList.remove('visible');
    }

    openInstallModal() {
        if (!this.installModal) {
            return;
        }
        if (this.installPrompt) {
            this.installCaption.textContent = 'Install the PWA for offline play and fast launch.';
            this.installConfirm.classList.remove('disabled');
            this.installConfirm.textContent = 'INSTALL';
        } else if (this.isIOS) {
            this.installCaption.textContent = 'To install on iOS, tap Share then Add to Home Screen.';
            this.installConfirm.classList.add('disabled');
            this.installConfirm.textContent = 'READY';
        } else {
            this.installCaption.textContent = 'Install via your browser menu to play offline.';
            this.installConfirm.classList.add('disabled');
            this.installConfirm.textContent = 'READY';
        }
        this.installModal.classList.add('active');
    }

    closeInstallModal() {
        if (!this.installModal) {
            return;
        }
        this.installModal.classList.remove('active');
    }

    async triggerInstall() {
        if (!this.installPrompt) {
            return;
        }
        this.installPrompt.prompt();
        await this.installPrompt.userChoice;
        this.installPrompt = null;
        this.hideInstallButton();
        this.closeInstallModal();
    }

    startGame() {
        this.gameState = 'playing';
        this.startScreen.classList.add('hidden');
        this.gameOverScreen.classList.add('hidden');
        this.resetGame();
        this.lastFrameTime = performance.now();
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    restartGame() {
        this.gameState = 'playing';
        this.gameOverScreen.classList.add('hidden');
        this.resetGame();
        this.lastFrameTime = performance.now();
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    resetGame() {
        this.score = 0;
        this.combo = 1;
        this.perfectStreak = 0;
        this.frameCount = 0;
        this.speedMultiplier = 1;
        this.gameSpeed = this.baseSpeed;
        this.currentGap = this.baseGap;
        this.gravityDirection = 1;
        this.endTimer = 0;
        this.lastFrameTime = null;
        this.trailTimer = 0;
        this.stability = this.maxStability;
        this.invulnerableTimer = 0;
        this.gracePeriod = 200;

        this.ball.x = this.width * 0.25;
        this.ball.y = this.height * 0.5;
        this.ball.velocity = 0;
        this.ball.trail = [];

        this.obstacles = [];
        this.shards = [];
        this.particles = [];
        this.streakTimer = 0;
        this.nextShardTimer = 180;
        this.nextObstacleSpacing = 480;

        this.updateHud();
    }

    gameLoop(timestamp) {
        if (this.gameState !== 'playing' && this.gameState !== 'ending') {
            return;
        }

        if (!this.lastFrameTime) {
            this.lastFrameTime = timestamp;
        }

        const deltaMs = Math.min(40, timestamp - this.lastFrameTime);
        const delta = deltaMs / 16.67;
        this.lastFrameTime = timestamp;

        if (this.gameState === 'ending') {
            this.updateEnding(delta);
        } else {
            this.update(delta);
        }
        this.draw();
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    updateEnding(delta) {
        this.updateParticles(delta);
        this.updateStars(delta);
        this.updateStreak(delta);
        this.endTimer -= delta;
        if (this.endTimer <= 0) {
            this.gameState = 'gameOver';
        }
    }

    update(delta) {
        this.frameCount += delta;

        if (this.gracePeriod > 0) {
            this.gracePeriod = Math.max(0, this.gracePeriod - delta);
        }
        if (this.invulnerableTimer > 0) {
            this.invulnerableTimer = Math.max(0, this.invulnerableTimer - delta);
        }

        this.updateDifficulty();
        this.updateBall(delta);
        this.updateObstacles(delta);
        this.updateShards(delta);
        this.updateParticles(delta);
        this.updateStars(delta);
        this.updateStreak(delta);
        this.checkCollisions();
    }

    updateDifficulty() {
        const comboBoost = (this.combo - 1) * 0.03;
        this.speedMultiplier = Math.min(1.7, 1 + this.frameCount / 3600 + comboBoost);
        this.gameSpeed = this.baseSpeed * this.speedMultiplier;
        this.currentGap = Math.max(this.minGap, this.baseGap - this.frameCount / 110);
        this.obstacleSpacing = Math.max(480, 480 - this.speedMultiplier * 10);

        this.speedElement.textContent = `Speed ${this.speedMultiplier.toFixed(1)}x`;
    }

    updateBall(delta) {
        this.ball.velocity += this.gravityBase * this.gravityDirection * delta;
        this.ball.velocity = this.clamp(this.ball.velocity, -this.velocityClamp, this.velocityClamp);
        this.ball.y += this.ball.velocity * delta;
        this.ball.velocity *= Math.pow(this.velocityDamp, delta);

        this.trailTimer += delta;
        while (this.trailTimer >= 1) {
            this.ball.trail.push({ x: this.ball.x, y: this.ball.y });
            this.trailTimer -= 1;
        }
        if (this.ball.trail.length > 14) {
            this.ball.trail.shift();
        }

        if (this.ball.y - this.ball.radius <= this.edgeBuffer) {
            this.handleStabilityHit('edge');
            this.ball.y = this.edgeBuffer + this.ball.radius;
            this.ball.velocity = 1.6;
            this.gravityDirection = 1;
        } else if (this.ball.y + this.ball.radius >= this.height - this.edgeBuffer) {
            this.handleStabilityHit('edge');
            this.ball.y = this.height - this.edgeBuffer - this.ball.radius;
            this.ball.velocity = -1.6;
            this.gravityDirection = -1;
        }
    }

    updateObstacles(delta) {
        const margin = 60;

        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            const width = obstacle.width || this.obstacleWidth;
            obstacle.x -= this.gameSpeed * delta;

            const sway = Math.sin(this.frameCount * obstacle.frequency + obstacle.phase) * obstacle.amplitude;
            obstacle.gapCenter = this.clamp(
                obstacle.baseY + sway,
                margin + obstacle.gapSize / 2,
                this.height - margin - obstacle.gapSize / 2
            );

            if (obstacle.pulse) {
                obstacle.pulseX = obstacle.x + width * 0.5;
                obstacle.pulseY = obstacle.gapCenter + obstacle.pulse.offset +
                    Math.sin(this.frameCount * obstacle.pulse.speed + obstacle.pulse.phase) * obstacle.pulse.amplitude;
            }

            if (!obstacle.passed && obstacle.x + width < this.ball.x - this.ball.radius) {
                obstacle.passed = true;
                this.handleGatePass(obstacle);
            }

            if (obstacle.x + width < -40) {
                this.obstacles.splice(i, 1);
            }
        }

        if (this.obstacles.length === 0 ||
            this.obstacles[this.obstacles.length - 1].x < this.width - this.nextObstacleSpacing) {
            this.createObstacle();
        }
    }

    createObstacle() {
        const earlyBoost = this.frameCount < 300 ? 50 : 0;
        const gapSize = this.currentGap + this.randomRange(-4, 6) + earlyBoost;
        const margin = 60;
        const baseY = this.randomRange(margin + gapSize / 2, this.height - margin - gapSize / 2);
        const amplitude = this.randomRange(12, 38) + this.speedMultiplier * 4;
        const frequency = this.randomRange(0.004, 0.009) + this.speedMultiplier * 0.0008;
        const phase = Math.random() * Math.PI * 2;
        const color = this.obstaclePalette[Math.floor(Math.random() * this.obstaclePalette.length)];
        const hasPulse = this.frameCount > 1200 && Math.random() < 0.12;
        const widthBoost = Math.pow(Math.random(), 0.5);
        const width = this.obstacleWidth * (1 + widthBoost * 0.7);
        const ringOffset = this.randomRange(-24, 24);
        const ringTilt = this.randomRange(-0.35, 0.35);
        const horizonBoost = this.randomRange(0.2, 0.55);

        const obstacle = {
            x: this.width + 40,
            width,
            gapSize,
            baseY,
            amplitude,
            frequency,
            phase,
            color,
            passed: false,
            gapCenter: baseY,
            ringOffset,
            ringTilt,
            horizonBoost,
            pulse: null,
            pulseX: 0,
            pulseY: 0
        };

        if (hasPulse) {
            obstacle.pulse = {
                radius: this.randomRange(6, 9),
                offset: this.randomRange(-gapSize * 0.2, gapSize * 0.2),
                amplitude: this.randomRange(6, 12),
                speed: this.randomRange(0.01, 0.02),
                phase: Math.random() * Math.PI * 2
            };
        }

        this.obstacles.push(obstacle);
        this.nextObstacleSpacing = this.obstacleSpacing + this.randomRange(0, 180) +
            Math.max(0, (width - this.obstacleWidth) * 0.4);
    }

    updateShards(delta) {
        if (this.frameCount < 1200) {
            return;
        }
        this.nextShardTimer -= delta;
        if (this.nextShardTimer <= 0) {
            this.createShard();
            this.nextShardTimer = Math.floor(this.randomRange(260, 360) / this.speedMultiplier);
        }

        for (let i = this.shards.length - 1; i >= 0; i--) {
            const shard = this.shards[i];
            shard.x -= shard.speed * delta;
            shard.y += shard.drift * delta;
            shard.rotation += shard.rotationSpeed * delta;

            if (shard.y < 30 || shard.y > this.height - 30) {
                shard.drift *= -1;
            }

            if (shard.x + shard.size < -40) {
                this.shards.splice(i, 1);
            }
        }
    }

    createShard() {
        const size = this.randomRange(5, 9);
        const shard = {
            x: this.width + 50,
            y: this.randomRange(40, this.height - 40),
            size,
            speed: this.gameSpeed * this.randomRange(0.65, 0.95),
            drift: this.randomRange(-0.25, 0.25),
            rotation: Math.random() * Math.PI,
            rotationSpeed: this.randomRange(-0.025, 0.025),
            color: this.obstaclePalette[Math.floor(Math.random() * this.obstaclePalette.length)]
        };

        this.shards.push(shard);
    }

    updateParticles(delta) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.x += particle.vx * delta;
            particle.y += particle.vy * delta;
            particle.vy += particle.gravity * delta;
            particle.life -= particle.decay * delta;

            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    updateStars(delta) {
        this.stars.forEach(star => {
            star.x -= star.speed * this.speedMultiplier * 0.6 * delta;
            if (star.x < -10) {
                star.x = this.width + 10;
                star.y = Math.random() * this.height;
                star.size = Math.random() * 2 + 0.5;
                star.alpha = Math.random() * 0.6 + 0.3;
            }
        });
    }

    updateStreak(delta) {
        if (this.streakTimer > 0) {
            this.streakTimer = Math.max(0, this.streakTimer - delta);
            if (this.streakTimer === 0) {
                this.streakBanner.classList.remove('active');
            }
        }
    }

    checkCollisions() {
        if (this.invulnerableTimer > 0 || this.gracePeriod > 0) {
            return;
        }
        for (const obstacle of this.obstacles) {
            const width = obstacle.width || this.obstacleWidth;
            const sideForgive = Math.min(12, width * 0.2);
            const xMin = obstacle.x + sideForgive;
            const xMax = obstacle.x + width - sideForgive;
            if (this.ball.x + this.ball.radius > xMin &&
                this.ball.x - this.ball.radius < xMax) {
                const gapTop = obstacle.gapCenter - obstacle.gapSize / 2;
                const gapBottom = obstacle.gapCenter + obstacle.gapSize / 2;
                const edgeForgive = Math.min(12, obstacle.gapSize * 0.12);
                const safeTop = gapTop - edgeForgive;
                const safeBottom = gapBottom + edgeForgive;

                if (this.ball.y - this.ball.radius < safeTop || this.ball.y + this.ball.radius > safeBottom) {
                    this.handleStabilityHit('gate');
                    return;
                }

                if (obstacle.pulse) {
                    const hit = this.distance(this.ball.x, this.ball.y, obstacle.pulseX, obstacle.pulseY) <
                        this.ball.radius + obstacle.pulse.radius;
                    if (hit) {
                        this.handleStabilityHit('pulse');
                        return;
                    }
                }
            }
        }

        for (const shard of this.shards) {
            const hit = this.distance(this.ball.x, this.ball.y, shard.x, shard.y) <
                this.ball.radius + shard.size * 0.7;
            if (hit) {
                this.handleStabilityHit('shard');
                return;
            }
        }
    }

    handleStabilityHit(source) {
        if (this.gameState !== 'playing') {
            return;
        }
        if (this.invulnerableTimer > 0 || this.gracePeriod > 0) {
            return;
        }

        this.stability -= 1;
        this.combo = 1;
        this.perfectStreak = 0;
        this.invulnerableTimer = 110;
        this.createCrashParticles();
        this.showStreak('Stability -1');
        this.updateHud();

        if (this.stability <= 0) {
            this.gameOver();
        }
    }

    handleGatePass(obstacle) {
        const distance = Math.abs(this.ball.y - obstacle.gapCenter);
        const perfect = distance <= this.perfectWindow;
        let points = 1;
        let streakText = '';

        if (perfect) {
            this.combo = Math.min(this.combo + 1, this.maxCombo);
            this.perfectStreak += 1;
            points = this.combo;
            streakText = `Perfect +${points}`;
            this.createScoreParticles('#ff7a59');
            if (this.perfectStreak >= this.healthStreakGoal && this.stability < this.maxStability) {
                this.perfectStreak = 0;
                this.stability = Math.min(this.maxStability, this.stability + 1);
                streakText = `Perfect +${points} | Stability +1`;
                this.createScoreParticles('#23f5d3');
            }
        } else {
            this.combo = 1;
            this.perfectStreak = 0;
            points = 1;
        }

        if (streakText) {
            this.showStreak(streakText);
        }
        this.score += points;
        this.updateHud();
    }

    showStreak(text) {
        this.streakBanner.textContent = text;
        this.streakBanner.classList.add('active');
        this.streakTimer = 50;
    }

    createFlipParticles() {
        for (let i = 0; i < 12; i++) {
            this.particles.push({
                x: this.ball.x,
                y: this.ball.y,
                vx: this.randomRange(-3, 3),
                vy: this.randomRange(-3, 3),
                gravity: 0.08,
                life: 1,
                decay: 0.03,
                size: this.randomRange(2, 4),
                color: '#23f5d3'
            });
        }
    }

    createScoreParticles(color) {
        for (let i = 0; i < 16; i++) {
            this.particles.push({
                x: this.ball.x + this.randomRange(-10, 10),
                y: this.ball.y + this.randomRange(-10, 10),
                vx: this.randomRange(-4, 4),
                vy: this.randomRange(-4, 4),
                gravity: 0.05,
                life: 1,
                decay: 0.025,
                size: this.randomRange(2, 5),
                color: color || '#ffd166'
            });
        }
    }

    createCrashParticles() {
        for (let i = 0; i < 28; i++) {
            this.particles.push({
                x: this.ball.x,
                y: this.ball.y,
                vx: this.randomRange(-6, 6),
                vy: this.randomRange(-6, 6),
                gravity: 0.12,
                life: 1,
                decay: 0.02,
                size: this.randomRange(2, 6),
                color: '#ff375f'
            });
        }
    }

    draw() {
        this.drawBackground();
        this.drawStars();
        this.drawRiftLines();
        this.drawObstacles();
        this.drawShards();
        this.drawBallTrail();
        this.drawBall();
        this.drawParticles();
        this.drawBoundaries();
    }

    drawBackground() {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#05070d');
        gradient.addColorStop(0.5, '#0b1220');
        gradient.addColorStop(1, '#0f1a2e');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        const glow = this.ctx.createRadialGradient(
            this.width * 0.8,
            this.height * 0.2,
            0,
            this.width * 0.8,
            this.height * 0.2,
            this.width * 0.9
        );
        glow.addColorStop(0, 'rgba(35, 245, 211, 0.08)');
        glow.addColorStop(1, 'rgba(35, 245, 211, 0)');
        this.ctx.fillStyle = glow;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    drawStars() {
        this.stars.forEach(star => {
            this.ctx.fillStyle = `rgba(233, 246, 255, ${star.alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    drawRiftLines() {
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(35, 245, 211, 0.08)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < 14; i++) {
            const offset = (this.frameCount * (0.6 + i * 0.02)) % this.height;
            const y = (offset + i * 55) % this.height;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y - 30);
            this.ctx.stroke();
        }
        this.ctx.restore();
    }

    drawObstacles() {
        this.obstacles.forEach(obstacle => {
            const gapTop = obstacle.gapCenter - obstacle.gapSize / 2;
            const gapBottom = obstacle.gapCenter + obstacle.gapSize / 2;
            const x = obstacle.x;
            const width = obstacle.width || this.obstacleWidth;
            const horizonColor = this.tintColor(obstacle.color, 40);
            const warmEdge = this.applyAlpha('#ff7a59', 0.5 + obstacle.horizonBoost * 0.2);

            const drawPanel = (y, height, edgeAtBottom) => {
                if (height <= 0) {
                    return;
                }
                const gradient = this.ctx.createLinearGradient(x, y, x + width, y);
                gradient.addColorStop(0, 'rgba(12, 14, 22, 0.92)');
                gradient.addColorStop(0.4, 'rgba(2, 3, 8, 0.98)');
                gradient.addColorStop(0.6, 'rgba(2, 3, 8, 0.98)');
                gradient.addColorStop(1, 'rgba(14, 16, 26, 0.9)');

                this.ctx.save();
                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(x, y, width, height);

                const rim = this.ctx.createLinearGradient(x, y, x + width, y);
                rim.addColorStop(0, 'rgba(0, 0, 0, 0)');
                rim.addColorStop(0.5, this.applyAlpha(horizonColor, 0.2));
                rim.addColorStop(1, 'rgba(0, 0, 0, 0)');
                this.ctx.strokeStyle = rim;
                this.ctx.lineWidth = 1.4;
                this.ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);

                const coreOffset = Math.min(56, height * 0.35);
                const coreY = edgeAtBottom ? y + height - coreOffset : y + coreOffset;
                const coreX = x + width * 0.5 + obstacle.ringTilt * width * 0.2;
                const coreRadius = Math.min(80, Math.max(28, height * (0.35 + obstacle.horizonBoost * 0.2)));
                const core = this.ctx.createRadialGradient(coreX, coreY, 0, coreX, coreY, coreRadius);
                core.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
                core.addColorStop(0.45, 'rgba(5, 6, 12, 0.88)');
                core.addColorStop(0.7, this.applyAlpha(horizonColor, 0.18));
                core.addColorStop(1, 'rgba(0, 0, 0, 0)');
                this.ctx.fillStyle = core;
                this.ctx.fillRect(x, y, width, height);

                const edgeY = edgeAtBottom ? y + height - 1.5 : y + 1.5;
                const edge = this.ctx.createLinearGradient(x, edgeY, x + width, edgeY);
                edge.addColorStop(0, 'rgba(0, 0, 0, 0)');
                edge.addColorStop(0.48, this.applyAlpha(horizonColor, 0.5 + obstacle.horizonBoost * 0.2));
                edge.addColorStop(0.55, warmEdge);
                edge.addColorStop(1, 'rgba(0, 0, 0, 0)');
                this.ctx.strokeStyle = edge;
                this.ctx.lineWidth = 2.4;
                this.ctx.shadowColor = this.applyAlpha(horizonColor, 0.7);
                this.ctx.shadowBlur = 12 + obstacle.horizonBoost * 10;
                this.ctx.beginPath();
                this.ctx.moveTo(x + 6, edgeY);
                this.ctx.lineTo(x + width - 6, edgeY);
                this.ctx.stroke();

                this.ctx.restore();
            };

            drawPanel(0, gapTop, true);
            drawPanel(gapBottom, this.height - gapBottom, false);

            const ringX = x + width * 0.5;
            const ringY = obstacle.gapCenter + obstacle.ringOffset;
            const ringRadiusX = width * 0.55;
            const ringRadiusY = Math.max(8, obstacle.gapSize * 0.08);
            this.ctx.save();
            this.ctx.translate(ringX, ringY);
            this.ctx.rotate(obstacle.ringTilt);
            this.ctx.scale(1, ringRadiusY / ringRadiusX);
            const ring = this.ctx.createLinearGradient(-ringRadiusX, 0, ringRadiusX, 0);
            ring.addColorStop(0, 'rgba(0, 0, 0, 0)');
            ring.addColorStop(0.5, this.applyAlpha(horizonColor, 0.7));
            ring.addColorStop(0.58, warmEdge);
            ring.addColorStop(1, 'rgba(0, 0, 0, 0)');
            this.ctx.strokeStyle = ring;
            this.ctx.lineWidth = 2.2;
            this.ctx.shadowColor = this.applyAlpha(horizonColor, 0.8);
            this.ctx.shadowBlur = 18 + obstacle.horizonBoost * 8;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, ringRadiusX, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.restore();

            if (obstacle.pulse) {
                const glow = this.ctx.createRadialGradient(
                    obstacle.pulseX,
                    obstacle.pulseY,
                    0,
                    obstacle.pulseX,
                    obstacle.pulseY,
                    obstacle.pulse.radius * 2.4
                );
                glow.addColorStop(0, 'rgba(255, 55, 95, 0.9)');
                glow.addColorStop(1, 'rgba(255, 55, 95, 0)');
                this.ctx.fillStyle = glow;
                this.ctx.beginPath();
                this.ctx.arc(obstacle.pulseX, obstacle.pulseY, obstacle.pulse.radius * 2.2, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.fillStyle = '#ff375f';
                this.ctx.beginPath();
                this.ctx.arc(obstacle.pulseX, obstacle.pulseY, obstacle.pulse.radius, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
    }

    drawShards() {
        this.shards.forEach(shard => {
            this.ctx.save();
            this.ctx.translate(shard.x, shard.y);
            this.ctx.rotate(shard.rotation);
            this.ctx.fillStyle = this.tintColor(shard.color, 40);
            this.ctx.shadowColor = shard.color;
            this.ctx.shadowBlur = 12;
            this.ctx.beginPath();
            this.ctx.moveTo(0, -shard.size);
            this.ctx.lineTo(shard.size, 0);
            this.ctx.lineTo(0, shard.size);
            this.ctx.lineTo(-shard.size, 0);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.restore();
        });
    }

    drawBallTrail() {
        this.ball.trail.forEach((point, index) => {
            const alpha = index / this.ball.trail.length;
            this.ctx.fillStyle = `rgba(35, 245, 211, ${alpha * 0.4})`;
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, this.ball.radius * alpha, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    drawBall() {
        const invulnerable = this.invulnerableTimer > 0;
        const flicker = invulnerable && Math.floor(this.invulnerableTimer / 6) % 2 === 0;
        this.ctx.save();
        this.ctx.globalAlpha = flicker ? 0.4 : 1;
        const glow = this.ctx.createRadialGradient(
            this.ball.x,
            this.ball.y,
            0,
            this.ball.x,
            this.ball.y,
            this.ball.radius * 3
        );
        glow.addColorStop(0, 'rgba(35, 245, 211, 0.9)');
        glow.addColorStop(1, 'rgba(35, 245, 211, 0)');
        this.ctx.fillStyle = glow;
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius * 2.4, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = this.ball.color;
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x - 4, this.ball.y - 4, this.ball.radius * 0.4, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    }

    drawParticles() {
        this.particles.forEach(particle => {
            this.ctx.fillStyle = this.applyAlpha(particle.color, particle.life);
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    drawBoundaries() {
        this.ctx.save();
        const gradient = this.ctx.createLinearGradient(0, 0, this.width, 0);
        gradient.addColorStop(0, 'rgba(255, 55, 95, 0)');
        gradient.addColorStop(0.5, 'rgba(255, 55, 95, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 55, 95, 0)');
        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.edgeBuffer + 2);
        this.ctx.lineTo(this.width, this.edgeBuffer + 2);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.height - this.edgeBuffer - 2);
        this.ctx.lineTo(this.width, this.height - this.edgeBuffer - 2);
        this.ctx.stroke();
        this.ctx.restore();
    }

    updateHud() {
        this.scoreElement.textContent = this.score;
        this.comboElement.textContent = `Combo x${this.combo}`;
        this.bestScoreElement.textContent = this.bestScore;
        if (this.stabilityElement) {
            this.stabilityElement.textContent = `Stability ${this.stability}`;
        }
    }

    gameOver() {
        if (this.gameState !== 'playing') {
            return;
        }

        this.gameState = 'ending';
        this.endTimer = 28;
        this.createCrashParticles();
        this.finalScoreElement.textContent = this.score;

        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            this.saveBestScore();
        }

        this.finalBestScoreElement.textContent = this.bestScore;
        this.bestScoreElement.textContent = this.bestScore;

        this.gameContainer.classList.add('shake');
        setTimeout(() => this.gameContainer.classList.remove('shake'), 380);
        setTimeout(() => this.gameOverScreen.classList.remove('hidden'), 320);
    }

    loadBestScore() {
        const saved = localStorage.getItem('gravityRiftBestScore');
        if (saved) {
            this.bestScore = parseInt(saved, 10) || 0;
            this.bestScoreElement.textContent = this.bestScore;
        }
    }

    saveBestScore() {
        localStorage.setItem('gravityRiftBestScore', this.bestScore.toString());
    }

    tintColor(color, amount) {
        const num = parseInt(color.replace('#', ''), 16);
        const r = this.clamp((num >> 16) + amount, 0, 255);
        const g = this.clamp(((num >> 8) & 255) + amount, 0, 255);
        const b = this.clamp((num & 255) + amount, 0, 255);
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }

    applyAlpha(color, alpha) {
        if (!color.startsWith('#')) {
            return color;
        }
        const num = parseInt(color.replace('#', ''), 16);
        const r = (num >> 16) & 255;
        const g = (num >> 8) & 255;
        const b = num & 255;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    randomRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    distance(x1, y1, x2, y2) {
        const dx = x1 - x2;
        const dy = y1 - y2;
        return Math.hypot(dx, dy);
    }
}

window.addEventListener('load', () => {
    new GravityRift();
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js');
    }
});

document.addEventListener('touchmove', (event) => {
    event.preventDefault();
}, { passive: false });
