// require: express socket.io shortid

var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var shortid = require('shortid');

server.listen(3001); // 监听的端口号，如果被占用，可以修改

var snakes = {}; // 当前场景中的蛇的信息

var foods = []; // 当前场景中的食物的信息

var body_lengths = {}; // 蛇身长度的校验，只有在收到吃掉食物消息时才修改

app.get('/test_connection', function (req, res) { // 测试连接
    res.send("success");
});

function getRandomInt(min, max) { // 获取一个min和max之间的随机整数（包含）
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

io.on('connection', function (socket) { // 创建socket连接

    socket.emit('connect'); // 发回连接确认消息

    var thisSnakeId = ""; // 当前蛇的id

    socket.on('req_init', function (data) { // 收到请求初始化消息时的响应

        if (snakes[thisSnakeId] != null) // 检查是否已删除旧的蛇
            delete snakes[thisSnakeId];

        thisSnakeId = shortid.generate(); // 生成蛇的id

        var x = getRandomInt(-21, 21); // 随机蛇的出生地
        var z = getRandomInt(-21, 21);

        var snake = {
            id: thisSnakeId,
            head_x: x,
            head_z: z,
            body_x: [x + 1, x + 2, x + 3, x + 4],
            body_z: [z, z, z, z],
            dir: 'up', // 初始方向
            speed: 'normal', // 初始速度
            alive: true,
            killed_by: '',
        };

        snakes[thisSnakeId] = snake;
        body_lengths[thisSnakeId] = 4; // 初始化蛇身长度

        socket.emit('init', snake); // 发回初始化消息
        socket.emit('init_foods', {'foods': foods}); // 发回初始化食物的消息
        socket.broadcast.emit('sync', snake) // 广播同步消息，将当前蛇同步给其他玩家
        socket.broadcast.emit('req_sync'); // 广播请求同步消息，将其他蛇同步给当前玩家
    });

    socket.on('sync', function (data) { // 收到同步消息时的响应
        if (data['body_x'].length != data['body_z'].length){ // 检查蛇身的x坐标长度和z坐标长度是否一致
            return;
        }

        if (data['body_x'].length != body_lengths[thisSnakeId]) { // 检查蛇身的长度是否与保存的蛇身长度一致
            return;
        }

        var snake = snakes[thisSnakeId];

        snake.head_x = data['head_x']; // 更新保存的当前蛇的信息
        snake.head_z = data['head_z'];
        snake.body_x = data['body_x'];
        snake.body_z = data['body_z'];
        snake.dir = data['dir'];
        snake.speed = data['speed'];
        snake.alive = data['alive'];
        snake.killed_by = data['killed_by'];

        socket.broadcast.emit('sync', snake); // 广播同步消息，将当前蛇同步给其他玩家
    });

    socket.on('generate_food', function (data) { // 收到生成食物消息时的响应

        var food = {
            x: data['x'],
            z: data['z'],
        }

        for (var i = 0; i < foods.length; i++) {
            if (foods[i].x == food.x && foods[i].z == food.z) { // 保存的食物列表已经有位置相同的食物
                return; // 不再生成该食物
            }
        }

        foods.push(food); // 将该食物添加到保存的食物列表中

        socket.broadcast.emit('generate_food', food); // 广播成功生成食物的消息
    });

    socket.on('eat_food', function (data) { // 收到吃掉食物消息时的响应

        var success = false; // 成功吃掉食物的标记（吃掉的食物可能不在保存的食物列表中）

        var food = {
            x: data['x'],
            z: data['z'],
        }

        for (var i = 0; i < foods.length; i++) {
            if (foods[i].x == food.x && foods[i].z == food.z) { // 在保存的食物列表中找到匹配的食物
                foods.splice(i, 1); // 从保存的食物列表中删除该食物
                body_lengths[thisSnakeId] ++; // 蛇身长度+1
                success = true;
                break;
            }
        }

        if (success) {
            socket.broadcast.emit('destroy_food', food); // 广播成功吃掉食物的消息
        }
    });

    socket.on('game_over', function (data) { // 收到当前蛇阵亡消息时的响应

        var snake = snakes[thisSnakeId];

        for (var i = 0; i < snake.body_x.length; i++) {
            foods.push({x: snake.body_x[i], z: snake.body_z[i]}); // 将当前蛇的蛇身都变成食物，保存到食物列表中
        }

        socket.broadcast.emit('another_game_over', snake); // 广播当前蛇阵亡的消息

        socket.emit('close'); // 发回断开连接请求，防止客户端自动重连
    });

    socket.on('quit', function (data) { // 收到玩家退出当前局消息时的响应

        var snake = snakes[thisSnakeId]; 

        socket.broadcast.emit('another_quit', snake); // 广播玩家退出当前局游戏的消息

        socket.emit('close'); // 发回断开连接请求，防止客户端自动重连
    });

    socket.on('disconnect', function () { // 收到玩家断开连接消息时的响应

        var snake = snakes[thisSnakeId];

        if (snake != null) {
            if (snake.alive) {
                socket.broadcast.emit('another_disconnect', snake); // 广播当前玩家断开连接的消息
            }
            delete snakes[thisSnakeId];
        }
        
        if (Object.keys(snakes).length == 0) { // 如果所有玩家都断开连接
            foods = []; // 清空食物列表
        }
    });
});
