
var io = require('socket.io')(3001);
var shortid = require('shortid');

console.log('server started');

var snakes = [];

io.on('connection', function (socket) {
    var thisSnakeId = shortid.generate();

    snakes[thisSnakeId] = {
        id: thisSnakeId,
        head_x: 0,
        head_z: 0,
        body_x: [1, 2, 3, 4],
        body_z: [0, 0, 0, 0],
        dir: 'up',
        speed: 'normal',
    };

    socket.emit('init', snakes[thisSnakeId]);

    socket.on('sync', function (data) {
        console.log('sync', JSON.stringify(data));

        var snake = snakes[thisSnakeId];

        snake.head_x = data['head_x'];
        snake.head_z = data['head_z'];
        snake.body_x = data['body_x'];
        snake.body_z = data['body_z'];
        snake.dir = data['dir'];
        snake.speed = data['speed'];

        socket.emit('sync, snake');
    });

    socket.on('disconnect', function () {
        console.log('client disconnected');

        delete snakes[thisSnakeId];
    });
});