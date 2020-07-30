var game = new Phaser.Game(800, 600, Phaser.AUTO, 'phaser-example', { preload: preload, create: create, update: update, render: render });

function preload() {
    game.load.image('bullet', 'assets/games/invaders/bullet.png');
    game.load.image('enemyBullet', 'assets/games/invaders/enemy-bullet.png');
    game.load.spritesheet('invader', 'assets/games/invaders/invader32x32x4.png', 32, 32);
    game.load.image('ship', 'assets/games/invaders/player.png');
    game.load.spritesheet('kaboom', 'assets/games/invaders/explode.png', 128, 128);
    game.load.image('starfield', 'assets/games/invaders/starfield.png');
    game.load.image('background', 'assets/games/starstruck/background2.png');
    game.load.image('menu', 'assets/games/invaders/menu.png'); //Se añadio la imagen para visualizar el menu
}

var player;
var aliens;
var bullets;
var bulletTime = 0;
var cursors;
var fireButton;
var explosions;
var starfield;
var score = 0;
var scoreString = '';
var scoreText;
var lives;
var enemyBullet;
var firingTimer = 0;
var stateText;
var livingEnemies = [];

// Se añadiron las siguiente variables
var nnNetwork , nnEntrenamiento, nnSalida, datosEntrenamiento = [];
var modoAuto = false, eCompleto = false;

var velocidadBala;
var despBala;
var estatusAire;
var estatuSuelo;

var bullets;

function create() {
    game.physics.startSystem(Phaser.Physics.ARCADE);

    //  El fondo de desplazamiento de Starfield
    starfield = game.add.tileSprite(0, 0, 800, 600, 'starfield');

    //  Nuestro grupo de bala
    bullets = game.add.group();
    bullets.enableBody = true;
    bullets.physicsBodyType = Phaser.Physics.ARCADE;
    bullets.createMultiple(1, 'bullet'); //Modificacion para que el heroe dispare una bala cada 0.5 segundos
    bullets.setAll('anchor.x', 0.5);
    bullets.setAll('anchor.y', 1);
    bullets.setAll('outOfBoundsKill', true);
    bullets.setAll('checkWorldBounds', true);

    // Las balas del enemigo
    enemyBullets = game.add.group();
    enemyBullets.enableBody = true;
    enemyBullets.physicsBodyType = Phaser.Physics.ARCADE;
    enemyBullets.createMultiple(1, 'enemyBullet'); //Modificacion para que el enemigo dispare una bala cada 0.5 segundos
    enemyBullets.setAll('anchor.x', 0.5);
    enemyBullets.setAll('anchor.y', 1);
    enemyBullets.setAll('outOfBoundsKill', true);
    enemyBullets.setAll('checkWorldBounds', true);

    //  ¡El héroe!
    player = game.add.sprite(400, 500, 'ship');
    player.anchor.setTo(0.5, 0.5);
    game.physics.enable(player, Phaser.Physics.ARCADE);

    //  ¡Los malos!
    aliens = game.add.group();
    aliens.enableBody = true;
    aliens.physicsBodyType = Phaser.Physics.ARCADE;

    createAliens();

    //  El marcador
    scoreString = 'Score : ';
    scoreText = game.add.text(10, 10, scoreString + score, { font: '34px Arial', fill: '#fff' });
    
    //  Pausa ----> Se añadio un boton de pausa para la IA y Manual
    pauseString = 'Pause';
    pauseText = game.add.text(350, 10, pauseString, { font: '34px Arial', fill: '#fff' });
    pauseText.inputEnabled = true;
    pauseText.events.onInputUp.add(pausa, self);
    game.input.onDown.add(mPausa, self);

    //  Vidas
    lives = game.add.group();
    game.add.text(game.world.width - 100, 10, 'Lives : ', { font: '34px Arial', fill: '#fff' });
    
    //  Texto
    stateText = game.add.text(game.world.centerX,game.world.centerY,' ', { font: '84px Arial', fill: '#fff' });
    stateText.anchor.setTo(0.5, 0.5);
    stateText.visible = false;

    for (var i = 0; i < 3; i++) {
        var ship = lives.create(game.world.width - 100 + (30 * i), 60, 'ship');
        ship.anchor.setTo(0.5, 0.5);
        ship.angle = 90;
        ship.alpha = 0.4;
    }

    //  Una piscina de explosión
    explosions = game.add.group();
    explosions.createMultiple(30, 'kaboom');
    explosions.forEach(setupInvader, this);

    //  Y algunos controles para jugar el juego con
    cursors = game.input.keyboard.createCursorKeys();
    fireButton = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
    // fireButton = game.physics.arcade.overlap(bullets);

    // Creacion del Perceptron
    nnNetwork =  new synaptic.Architect.Perceptron(3, 6, 6, 2);
    nnEntrenamiento = new synaptic.Trainer(nnNetwork);
}

// Se añdio para crear la red neuronal
function enRedNeural(){
    nnEntrenamiento.train(datosEntrenamiento, {rate: 0.0003, iterations: 10000, shuffle: true});
}

// Se añadio para crear el data set de entrenamiento
function datosDeEntrenamiento(param_entrada){
    console.log("Entrada", param_entrada[0] + " " + param_entrada[1]);
    nnSalida = nnNetwork.activate(param_entrada);
    var aire = Math.round( nnSalida[0] * 100 );
    var piso = Math.round( nnSalida[1] * 100 );
    console.log("Valor ", "En el Aire %: " + aire + " En el suelo %: " + piso );
    return nnSalida[0] >= nnSalida[1];
}

// Se añadio el Menu para pausar el juego
function pausa() {
    game.paused = true;
    menu = game.add.sprite(800/2,600/2, 'menu');
    menu.anchor.setTo(0.5, 0.5);
}

// Se añadio para definir el comportamiento cuando el menu esta en pausa
function mPausa(event){
    if (game.paused) {
        var menu_x1 = 800/2 - 270/2, menu_x2 = 800/2 + 270/2,
            menu_y1 = 600/2 - 180/2, menu_y2 = 600/2 + 180/2;

        var mouse_x = event.x,
            mouse_y = event.y;

        if (mouse_x > menu_x1 && mouse_x < menu_x2 && mouse_y > menu_y1 && mouse_y < menu_y2 ) {
            if (mouse_x >= menu_x1 && mouse_x <= menu_x2 && mouse_y >= menu_y1 && mouse_y <= menu_y1 + 90) {
                eCompleto = false;
                datosEntrenamiento = [];
                modoAuto = false;
            } else if (mouse_x >= menu_x1 && mouse_x <= menu_x2 && mouse_y >= menu_y1 + 90 && mouse_y <= menu_y2) {
                if (!eCompleto) {
                    console.log("", "Entrenamiento " + datosEntrenamiento.length + " valores" );
                    enRedNeural();
                    eCompleto = true;
                }
                modoAuto = true;
            }

            menu.destroy();
            resetVariables();
            game.paused = false;
        }
    }
}

// Se añadio para restablecer las variables del player, alients, y balas
function resetVariables() {
    // Regresar la nave del heroe a su posicion inicial
    player.x = 400;
    player.y = 500;
    player.revive();

    // Regresar disparo a la posicion inicial del heroe
    bullets.removeAll();
    bullets.enableBody = true;
    bullets.physicsBodyType = Phaser.Physics.ARCADE;
    bullets.createMultiple(1, 'bullet');
    bullets.setAll('anchor.x', 0.5);
    bullets.setAll('anchor.y', 1);
    bullets.setAll('outOfBoundsKill', true);
    bullets.setAll('checkWorldBounds', true);

    // Regresar disparo a la posicion ramdom del enemigo
    enemyBullets.removeAll();
    enemyBullets.enableBody = true;
    enemyBullets.physicsBodyType = Phaser.Physics.ARCADE;
    enemyBullets.createMultiple(1, 'enemyBullet');
    enemyBullets.setAll('anchor.x', 0.5);
    enemyBullets.setAll('anchor.y', 1);
    enemyBullets.setAll('outOfBoundsKill', true);
    enemyBullets.setAll('checkWorldBounds', true);

    // Remover todas la naves enemigas y regresarla a la posicion inicial
    aliens.removeAll();
    createAliens();
}

function createAliens () {
    for (var y = 0; y < 4; y++) {
        for (var x = 0; x < 10; x++) {
            var alien = aliens.create(x * 48, y * 50, 'invader');
            alien.anchor.setTo(0.5, 0.5);
            alien.animations.add('fly', [ 0, 1, 2, 3 ], 20, true);
            alien.play('fly');
            alien.body.moves = false;
        }
    }

    aliens.x = 100;
    aliens.y = 50;

    //  Todo lo que hace es básicamente iniciar el movimiento de los invasores. Observe que estamos moviendo el Grupo al que pertenecen, en lugar de los invasores directamente.
    var tween = game.add.tween(aliens).to( { x: 200 }, 2000, Phaser.Easing.Linear.None, true, 0, 1000, true);

    //  Cuando la interpolación gira, llama descender
    tween.onLoop.add(descend, this);
}

function setupInvader (invader) {
    invader.anchor.x = 0.5;
    invader.anchor.y = 0.5;
    invader.animations.add('kaboom');
}

function descend() {
    aliens.y += 10;
}

function update() {
    //  Desplazarse por el fondo
    starfield.tilePosition.y += 2;

    if (player.alive) {
        //  Reinicia el reproductor, luego verifica las teclas de movimiento
        player.body.velocity.setTo(0, 0);

        if (cursors.left.isDown) {
            player.body.velocity.x = -200;
        }
        else if (cursors.right.isDown) {
            player.body.velocity.x = 200;
        }

        //  ¿Disparo?
        if (fireButton.isDown) {
            fireBullet();
        } else if (livingEnemies.length > 0) { // Se añadio para disparar automaticamente
            fireBullet();
        }

        if (game.time.now > firingTimer) {
            enemyFires();
        }
        //  Ejecutar colisión
        game.physics.arcade.overlap(bullets, aliens, collisionHandler, null, this);
        game.physics.arcade.overlap(enemyBullets, player, enemyHitsPlayer, null, this);
    }
    
    estatuSuelo = Math.floor( player.position.x ); // Se añadio para obtener la poscion de la name del heroe

    if( modoAuto == true  && despBalaY > 0 && player.body.onFloor()) {
        if( datosDeEntrenamiento( [despBalaX , velocidadBala , despBalaY] ) [0] ){
            saltar();
        } 
        
        if ( datosDeEntrenamiento( [despBalaX , velocidadBala , despBalaY] ) [1] ){
            down();
            console.log(datosDeEntrenamiento( [despBalaX , velocidadBala , despBalaY] ));
        }
        console.log(datosDeEntrenamiento( [despBalaX , velocidadBala , despBalaY] ));
   
    }
    // Se añadio para saber si esta en modo de juego o de entreaniento
    if( modoAuto == false && despBalaY > 0)  { //
        datosEntrenamiento.push({
            'input' :  [despBalaX, despBalaY , velocidadBala],
            'output':  [estatuSuelo ]  
        });

        console.log("Desplazamiento Bala X: " + despBalaX, " Desplazamiento Bala Y: " + despBalaY, 
            "Velocidad Bala: " + velocidadBala, "Estatus Suelo: " + estatuSuelo);
   }
}

function render() {
    // for (var i = 0; i < aliens.length; i++)
    // {
    //     game.debug.body(aliens.children[i]);
    // }
}

function collisionHandler (bullet, alien) {
    //  Cuando una bala golpea a un alienígena los matamos a los dos.
    bullet.kill();
    alien.kill();

    //  Aumentar la puntuación
    score += 20;
    scoreText.text = scoreString + score;

    //  Y crea una explosión :)
    var explosion = explosions.getFirstExists(false);
    explosion.reset(alien.body.x, alien.body.y);
    explosion.play('kaboom', 30, false, true);

    if (aliens.countLiving() == 0) {
        score += 1000;
        scoreText.text = scoreString + score;

        enemyBullets.callAll('kill', this);
        stateText.text = " You Win, \n Click to restart";
        stateText.visible = true;

        // El controlador "haga clic para reiniciar"
        game.input.onTap.addOnce(restart, this);
    }

}

function enemyHitsPlayer (player, bullet) {
    bullet.kill();

    live = lives.getFirstAlive();

    if (live) {
        live.kill();
    }

    //  Y crea una explosión :)
    var explosion = explosions.getFirstExists(false);
    explosion.reset(player.body.x, player.body.y);
    explosion.play('kaboom', 30, false, true);

    // Cuando el player muere
    if (lives.countLiving() < 1) {
        player.kill();
        enemyBullets.callAll('kill');

        stateText.text=" GAME OVER \n Click to restart";
        stateText.visible = true;

        // El controlador "haga clic para reiniciar"
        game.input.onTap.addOnce(restart,this);
    }
}

function enemyFires () {
    //  Agarra la primera bala que podamos de la piscina
    enemyBullet = enemyBullets.getFirstExists(false);

    livingEnemies.length = 0;

    aliens.forEachAlive(function(alien) {
        // Coloca a cada enemigo vivo en una matriz
        livingEnemies.push(alien);
    });


    if (enemyBullet && livingEnemies.length > 0) {
        var random = game.rnd.integerInRange(0, livingEnemies.length - 1);

        // Seleccione al azar uno de ellos
        var shooter = livingEnemies[random];
        // Y dispara la bala de este enemigo
        enemyBullet.reset(shooter.body.x, shooter.body.y);
        
        despBalaX = Math.floor( player.position.x - enemyBullet.position.x ); //Se añadio para saber la posicion de la bala enemiga
        despBalaY = Math.floor( player.position.y - enemyBullet.position.y ); //Se añadio para saber la posicion de la bala enemiga
        
        game.physics.arcade.moveToObject(enemyBullet, player, 120);
        firingTimer = game.time.now + 2000;
        
        velocidadBala = Math.floor(enemyBullet.body.velocity.y); //Se añadio para saber la velocidad de desplazameinto de la bala enemiga
    }
}

function fireBullet () {
    //  Para evitar que se les permita disparar demasiado rápido, establecemos un límite de tiempo
    if (game.time.now > bulletTime) {
        //  Agarra la primera bala que podamos de la piscina
        bullet = bullets.getFirstExists(false);

        if (bullet) {
            //  Y dispararlo
            bullet.reset(player.x, player.y + 8);
            bullet.body.velocity.y = -400;
            bulletTime = game.time.now + 200;
        }
    }
}

function resetBullet (bullet) {
    //  Llamado si la bala sale de la pantalla
    bullet.kill();
}

function restart () {
    //  Comienza un nuevo nivel
    
    // Restablece el conteo de vida
    lives.callAll('revive');
    //  Y trae a los extraterrestres de la muerte :)
    aliens.removeAll();
    createAliens();

    // Revive al player
    player.revive();
    // Oculta el texto
    stateText.visible = false;
}