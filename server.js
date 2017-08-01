// require: express socket.io shortid

var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var shortid = require('shortid');

server.listen(3001);

console.log('server started');

var snakes = {};

var foods = [];

var body_lengths = {};

app.get('/test_connection', function (req, res) {
    res.send("success");
});

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

io.on('connection', function (socket) {

    console.log('client connected');

    socket.emit('connect');

    var thisSnakeId = "";

    socket.on('req_init', function (data) {
        console.log('req_init');

        if (snakes[thisSnakeId] != null)
            delete snakes[thisSnakeId];

        thisSnakeId = shortid.generate();

        var x = getRandomInt(-21, 21);
        var z = getRandomInt(-21, 21);

        var snake = {
            id: thisSnakeId,
            head_x: x,
            head_z: z,
            body_x: [x + 1, x + 2, x + 3, x + 4],
            body_z: [z, z, z, z],
            dir: 'up',
            speed: 'normal',
            alive: true,
            killed_by: '',
        };

        snakes[thisSnakeId] = snake;
        body_lengths[thisSnakeId] = 4;

        socket.emit('init', snake);
        socket.emit('init_foods', {'foods': foods});
        socket.broadcast.emit('sync', snake)
        socket.broadcast.emit('req_sync');
    });

    socket.on('sync', function (data) {
        if (data['body_x'].length != data['body_z'].length){
            console.log('body lengths not equal!');
            return;
        }

        if (data['body_x'].length != body_lengths[thisSnakeId]) {
            console.log('snake length unsynced!');
            return;
        }

        //console.log('sync', JSON.stringify(data));


        var snake = snakes[thisSnakeId];

        snake.head_x = data['head_x'];
        snake.head_z = data['head_z'];
        snake.body_x = data['body_x'];
        snake.body_z = data['body_z'];
        snake.dir = data['dir'];
        snake.speed = data['speed'];
        snake.alive = data['alive'];
        snake.killed_by = data['killed_by'];

        socket.broadcast.emit('sync', snake);
    });

    socket.on('generate_food', function (data) {
        //console.log('generate_food', JSON.stringify(data));

        var food = {
            x: data['x'],
            z: data['z'],
        }

        foods.push(food);

        socket.broadcast.emit('generate_food', food);
    });

    socket.on('eat_food', function (data) {
        //console.log('eat_food', JSON.stringify(data));

        var success = false;

        var food = {
            x: data['x'],
            z: data['z'],
        }

        for (var i = 0; i < foods.length; i++) {
            if (foods[i].x == food.x && foods[i].z == food.z) {
                foods.splice(i, 1);
                body_lengths[thisSnakeId] ++;
                success = true;
                break;
            }
        }

        if (success) {
            socket.broadcast.emit('destroy_food', food);
        }
    });

    socket.on('game_over', function (data) {
        console.log('game_over', thisSnakeId);

        var snake = snakes[thisSnakeId];

        for (var i = 0; i < snake.body_x.length; i++) {
            foods.push({x: snake.body_x[i], z: snake.body_z[i]});
        }

        socket.broadcast.emit('another_game_over', snake);

        socket.emit('close');
    });

    socket.on('quit', function (data) {
        console.log('quit', thisSnakeId);

        var snake = snakes[thisSnakeId];

        socket.broadcast.emit('another_quit', snake);

        socket.emit('close');
    });

    // io.sockets.emit('spawn');

    socket.on('disconnect', function () {
        console.log('client disconnected');

        var snake = snakes[thisSnakeId];

        if (snake != null) {
            if (snake.alive) {
                socket.broadcast.emit('another_disconnect', snake);
            }
            delete snakes[thisSnakeId];
        }
        
        if (Object.keys(snakes).length == 0) {
            console.log('all clients disconnected');
            foods = [];
        }
    });
});
