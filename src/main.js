import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue background
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Game state
let gameStartTime = null;
let gameEndTime = null;
let isGameComplete = false;
let isGameStarted = false;
const startPosition = new THREE.Vector3(0, 2, 20);

// Create start message
const startMessageDiv = document.createElement('div');
startMessageDiv.style.position = 'absolute';
startMessageDiv.style.top = '50%';
startMessageDiv.style.left = '50%';
startMessageDiv.style.transform = 'translate(-50%, -50%)';
startMessageDiv.style.color = 'white';
startMessageDiv.style.fontSize = '48px';
startMessageDiv.style.fontFamily = 'Arial';
startMessageDiv.style.textAlign = 'center';
startMessageDiv.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
startMessageDiv.textContent = 'Press SPACE to Start';
document.body.appendChild(startMessageDiv);

// Create disclaimer message
const disclaimerDiv = document.createElement('div');
disclaimerDiv.style.position = 'absolute';
disclaimerDiv.style.top = '20px';
disclaimerDiv.style.left = '50%';
disclaimerDiv.style.transform = 'translateX(-50%)';
disclaimerDiv.style.color = 'white';
disclaimerDiv.style.fontSize = '24px';
disclaimerDiv.style.fontFamily = 'Arial';
disclaimerDiv.style.textAlign = 'center';
disclaimerDiv.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
disclaimerDiv.textContent = 'Fill 100 plates as fast as you can!';
document.body.appendChild(disclaimerDiv);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(0, 10, 0);
scene.add(directionalLight);

// Ground
const groundGeometry = new THREE.PlaneGeometry(100, 100);
const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x228B22, // Forest green
    roughness: 0.8,
    metalness: 0.2
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Player controls
const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

// Player physics
let playerVelocity = new THREE.Vector3();
let playerOnGround = true;
const jumpForce = 0.2;
const gravity = 0.01;
const playerHeight = 2;

// Click to start
document.addEventListener('click', () => {
    controls.lock();
});

// Create clouds
function createCloud() {
    const cloudGroup = new THREE.Group();
    const cloudMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffffff,
        roughness: 0.8,
        metalness: 0.1
    });

    // Create multiple spheres to form a cloud
    for (let i = 0; i < 5; i++) {
        const size = 2 + Math.random() * 2;
        const cloudPiece = new THREE.Mesh(
            new THREE.SphereGeometry(size, 16, 16),
            cloudMaterial
        );
        cloudPiece.position.set(
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 4
        );
        cloudGroup.add(cloudPiece);
    }

    return cloudGroup;
}

// Add clouds to scene
const clouds = [];
for (let i = 0; i < 10; i++) {
    const cloud = createCloud();
    cloud.position.set(
        (Math.random() - 0.5) * 100,
        20 + Math.random() * 10,
        (Math.random() - 0.5) * 100
    );
    cloud.userData.speed = 0.02 + Math.random() * 0.03;
    scene.add(cloud);
    clouds.push(cloud);
}

// Taco throwing
let tacos = [];
let plates = [];
let score = 0;
const scoreElement = document.getElementById('score');

// Create plates
for (let i = 0; i < 100; i++) {
    // Create plate group
    const plateGroup = new THREE.Group();
    
    // Create plate base
    const plateGeometry = new THREE.CylinderGeometry(1, 1, 0.1, 32);
    const plateMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffffff,
        roughness: 0.3,
        metalness: 0.5
    });
    const plate = new THREE.Mesh(plateGeometry, plateMaterial);
    plateGroup.add(plate);
    
    // Add center circle
    const circleGeometry = new THREE.CircleGeometry(0.7, 32);
    const circleMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.4,
        metalness: 0.6,
        side: THREE.DoubleSide
    });
    const circle = new THREE.Mesh(circleGeometry, circleMaterial);
    circle.rotation.x = -Math.PI / 2;
    circle.position.y = 0.06;
    plateGroup.add(circle);
    
    // Arrange plates in a grid
    const row = Math.floor(i / 10);
    const col = i % 10;
    plateGroup.position.set(col * 5 - 22.5, 0.05, row * 5 - 22.5);
    plateGroup.userData.hit = false;
    scene.add(plateGroup);
    plates.push(plateGroup);
}

// Create game over message
const gameOverDiv = document.createElement('div');
gameOverDiv.style.position = 'absolute';
gameOverDiv.style.top = '50%';
gameOverDiv.style.left = '50%';
gameOverDiv.style.transform = 'translate(-50%, -50%)';
gameOverDiv.style.color = 'white';
gameOverDiv.style.fontSize = '48px';
gameOverDiv.style.fontFamily = 'Arial';
gameOverDiv.style.textAlign = 'center';
gameOverDiv.style.display = 'none';
gameOverDiv.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
document.body.appendChild(gameOverDiv);

// Reset game function
function resetGame() {
    // Reset player position
    controls.getObject().position.copy(startPosition);
    playerVelocity.set(0, 0, 0);
    
    // Reset plates
    plates.forEach(plate => {
        plate.userData.hit = false;
        plate.children.forEach(child => {
            child.material.color.set(0xffffff);
        });
    });
    
    // Remove all tacos
    tacos.forEach(taco => scene.remove(taco));
    tacos = [];
    
    // Reset score
    score = 0;
    scoreElement.textContent = `Plates Hit: ${score}/100`;
    
    // Reset game state
    gameStartTime = null;
    gameEndTime = null;
    isGameComplete = false;
    isGameStarted = false;
    gameOverDiv.style.display = 'none';
    startMessageDiv.style.display = 'block';
    
    // Lock controls
    controls.lock();
}

// Start game
resetGame();

// Movement
const moveSpeed = 0.1;
const keys = {};
document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    // Start game or jump when space is pressed
    if (e.code === 'Space') {
        if (!isGameStarted && !isGameComplete) {
            // Start the game
            isGameStarted = true;
            gameStartTime = Date.now();
            startMessageDiv.style.display = 'none';
            controls.lock();
        } else if (playerOnGround && isGameStarted) {
            // Normal jump
            playerVelocity.y = jumpForce;
            playerOnGround = false;
        }
        // Restart game if completed
        if (isGameComplete) {
            resetGame();
        }
    }
});
document.addEventListener('keyup', (e) => keys[e.code] = false);

// Create detailed taco geometry
function createTaco() {
    const tacoGroup = new THREE.Group();

    // Create half circle shape
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.arc(0, 0, 1, 0, Math.PI, false);
    
    // Extrude settings
    const extrudeSettings = {
        steps: 1,
        depth: 0.5,
        bevelEnabled: false
    };

    // Create the geometry
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Create material
    const tacoMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFD700, // Bright yellow color
        roughness: 0.7,
        metalness: 0.1,
        side: THREE.DoubleSide
    });

    // Create the taco
    const taco = new THREE.Mesh(geometry, tacoMaterial);
    taco.scale.set(0.5, 0.5, 0.5);
    
    // Rotate to face forward
    taco.rotation.x = Math.PI / 2;
    taco.rotation.z = Math.PI;


    let tacoRotation = Math.random() * Math.PI * 2
    
    // Add some random rotation to make each taco look unique
    taco.rotation.z += tacoRotation;
    
    tacoGroup.add(taco);

    // Add fillings
    const cubeSize = 0.1;
    const cubeGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

    // Create materials for different fillings
    const lettuceMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 }); // Forest green
    const tomatoMaterial = new THREE.MeshStandardMaterial({ color: 0xFF0000 }); // Red
    const meatMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Brown

    // Add fillings along the edge
    const numFillings = 24; // Number of fillings to place
    for (let i = 0; i < numFillings; i++) {
        const material = [lettuceMaterial, tomatoMaterial, meatMaterial][Math.floor(Math.random() * 3)];
        const cube = new THREE.Mesh(cubeGeometry, material);
        
        // Calculate position along the edge, accounting for taco rotation
        const angle = (i / numFillings) * Math.PI + tacoRotation + Math.PI; // Add taco rotation to align
        const radius = 0.5; // Exactly at the edge of the taco
        
        cube.position.x = Math.cos(angle) * radius;
        cube.position.y = -.25/2 + (-.1+ Math.random() /5); // Slightly above the taco
        cube.position.z = Math.sin(angle) * radius;
        
        // Random rotation
        cube.rotation.x = Math.random() * Math.PI;
        cube.rotation.y = Math.random() * Math.PI;
        cube.rotation.z = Math.random() * Math.PI;
        
        tacoGroup.add(cube);
    }

    return tacoGroup;
}

// Throw taco
document.addEventListener('mousedown', (e) => {
    if (e.button === 0 && controls.isLocked && isGameStarted) {
        const taco = createTaco();
        taco.position.copy(controls.getObject().position);
        taco.velocity = new THREE.Vector3();
        
        // Get direction from camera
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);
        taco.velocity.copy(direction.multiplyScalar(0.5));
        
        scene.add(taco);
        tacos.push(taco);
    }
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Update clouds
    clouds.forEach(cloud => {
        cloud.position.x += cloud.userData.speed;
        if (cloud.position.x > 50) {
            cloud.position.x = -50;
        }
    });

    // Update timer if game is in progress
    if (gameStartTime && !gameEndTime && !isGameComplete) {
        const elapsedTime = ((Date.now() - gameStartTime) / 1000).toFixed(1);
        scoreElement.textContent = `Plates Hit: ${score}/100 | Time: ${elapsedTime}s`;
    }

    // Movement and jumping
    if (controls.isLocked && isGameStarted) {
        // Apply gravity
        playerVelocity.y -= gravity;
        controls.getObject().position.y += playerVelocity.y;

        // Ground check
        if (controls.getObject().position.y < playerHeight) {
            controls.getObject().position.y = playerHeight;
            playerVelocity.y = 0;
            playerOnGround = true;
        }

        // Horizontal movement
        if (keys['KeyW']) controls.moveForward(moveSpeed);
        if (keys['KeyS']) controls.moveForward(-moveSpeed);
        if (keys['KeyA']) controls.moveRight(-moveSpeed);
        if (keys['KeyD']) controls.moveRight(moveSpeed);
    }

    // Update tacos
    for (let i = tacos.length - 1; i >= 0; i--) {
        const taco = tacos[i];
        
        // Apply gravity
        taco.velocity.y -= 0.01;

        // Apply friction when on ground
        if (taco.position.y <= 0.5) {
            // Ground friction - increased friction (lower value = more friction)
            const friction = 0.85; // Changed from 0.95 to 0.85 for more friction
            taco.velocity.x *= friction;
            taco.velocity.z *= friction;
            
            // Stop completely if moving very slowly - increased threshold
            if (Math.abs(taco.velocity.x) < 0.005) taco.velocity.x = 0; // Changed from 0.001 to 0.005
            if (Math.abs(taco.velocity.z) < 0.005) taco.velocity.z = 0; // Changed from 0.001 to 0.005
            
            // Stop rotation when on ground
            taco.rotation.x = Math.PI / 2;
            taco.rotation.z = taco.rotation.z % (Math.PI * 2);
        } else {
            // Air rotation
            taco.rotation.x += 0.1;
            taco.rotation.z += 0.05;
        }

        // Update position
        taco.position.add(taco.velocity);

        // Ground collision with bounce reduction
        if (taco.position.y < 0.5) {
            taco.position.y = 0.5;
            taco.velocity.y = 0;
            // Reduce horizontal velocity on impact
            taco.velocity.x *= 0.8;
            taco.velocity.z *= 0.8;
        }

        // Check for plate collisions
        plates.forEach(plate => {
            if (!plate.userData.hit && 
                taco.position.distanceTo(plate.position) < 1.5) {
                plate.userData.hit = true;
                // Turn plate green when hit
                plate.children.forEach(child => {
                    child.material.color.set(0x00ff00);
                });
                score++;
                
                // Stop the taco's movement and rotation
                taco.velocity.set(0, 0, 0);
                taco.rotation.x = Math.PI / 2;
                taco.rotation.z = taco.rotation.z % (Math.PI * 2);
                
                // Position the taco on the plate
                taco.position.y = 0.5;
                taco.position.x = plate.position.x;
                taco.position.z = plate.position.z;
                
                // Remove from active tacos array but keep in scene
                tacos.splice(i, 1);

                // Check if game is complete
                if (score === 100 && !isGameComplete) {
                    gameEndTime = Date.now();
                    isGameComplete = true;
                    const totalTime = ((gameEndTime - gameStartTime) / 1000).toFixed(1);
                    gameOverDiv.textContent = `Taco Time: ${totalTime}s\nPress SPACE to restart`;
                    gameOverDiv.style.display = 'block';
                    controls.unlock();
                }
            }
        });
    }

    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start the game
camera.position.set(0, playerHeight, 10);
animate(); 