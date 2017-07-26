// require: express socket.io shortid

var io = require('socket.io')(3001);
var shortid = require('shortid');

console.log('server started');

// console.log(shortid.generate());

var snakes = [];

io.on('connection', function (socket) {

    var thisSnakeId = shortid.generate();

    var snake = {
        id: thisSnakeId,
        head_x: 0,
        head_z: 0,
        body_x: [1, 2, 3, 4],
        body_z: [0, 0, 0, 0],
        dir: 'up',
        speed: 'normal',
    };

    snakes[thisSnakeId] = snake;

    socket.emit('init', snake);
    socket.broadcast.emit('init_another', snake)

    socket.broadcast.emit('req_sync');

    socket.on('sync', function (data) {
        // console.log('sync', JSON.stringify(data));

        var snake = snakes[thisSnakeId];

        snake.head_x = data['head_x'];
        snake.head_z = data['head_z'];
        snake.body_x = data['body_x'];
        snake.body_z = data['body_z'];
        snake.dir = data['dir'];
        snake.speed = data['speed'];

        socket.emit('sync', snake);
        socket.broadcast.emit('sync_another', snake);

    });

    // console.log('client connected, broadcast spawn, id:', thisSnakeId);

    // for (var snakeId in snakes) {
    //  if (snakeId == thisSnakeId)
    //      continue;

    //  socket.emit('spawn', snakes[snakeId]);
    // }

    // socket.emit('spawn');

    // socket.broadcast.emit('spawn');

    // io.sockets.emit('spawn');

    // socket.on('move', function (data) {
    //  data.id = thisSnakeId;
    //  console.log('client moved', JSON.stringify(data));
    // });

    socket.on('disconnect', function () {
        console.log('client disconnected');

        delete snakes[thisSnakeId];

        // socket.broadcast.emit('disconnected', {id: thisSnakeId});
    });
});

