/**
 * Command Line Interface for the application
 */
const readline = require('readline');
const util = require('util');
const os = require('os');
const v8 = require('v8'); //metrics about the runtime environemnt
const { list, read } = require('./data');
const debug = util.debuglog('cli'); //NODE_DEBUG=cli node index.js
const events = require('events');
class _events extends events {}
const e = new _events(); //to handle user inputs

const cli = {};

//event handlers(bind to the events emitted in cli.handleInput)
e.on('man', () => {
  cli.responders.help();
});

e.on('help', () => {
  cli.responders.help();
});

e.on('exit', () => {
  cli.responders.exit();
});

e.on('stats', () => {
  cli.responders.stats();
});

e.on('list users', () => {
  cli.responders.listUsers();
});

e.on('recent users', () => {
  cli.responders.recentUsers();
});

e.on('more user info', str => {
  cli.responders.moreUserInfo(str);
});

e.on('list carts', () => {
  cli.responders.listCarts();
});

e.on('more cart info', str => {
  cli.responders.moreCartInfo(str);
});

e.on('list orders', () => {
  cli.responders.listOrders();
});

e.on('more order info', str => {
  cli.responders.moreOrderInfo(str);
});

e.on('list menu', () => {
  cli.responders.listMenu();
});

e.on('recent orders', () => {
  cli.responders.recentOrders();
});

// container for responses to user
cli.responders = {};

cli.responders.help = () => {
  const commands = {
    exit: 'Exit the CLI and kill the rest of the application',
    man: 'Show this help menu',
    help: 'An alias to the "man" command',
    stats:
      'Show the stats on the underlying operating system and resource utilization',
    'list users':
      'Show a list of all registered (not deleted) users in the system',
    'recent users': 'Show a list of users who signed up in the last 24 hours',
    'more user info --{userEmail}': 'Get detailed info about a specific user',
    'list carts': 'Show a list of all cart instances in the system',
    'more cart info --{cartId}': 'Get detailed info about a specific cart',
    'list orders': 'Show a list of all orders in the system',
    'recent orders': 'Show a list of orders placed in the last 24 hours',
    'more order info --{orderId}': 'Get detailed info about a specific order',
    'list menu': 'Show a list of all items on the menu'
  };

  //show a header for the help menu
  cli.horizontalLine();
  cli.centered('CLI Manual');
  cli.horizontalLine();
  cli.verticalSpace(2);
  //show each comman/explanation
  for (let key in commands) {
    if (commands.hasOwnProperty(key)) {
      const desc = commands[key];
      let line = `\x1b[33m${key}\x1b[0m`;
      const padding = 60 - line.length;
      for (i = 0; i < padding; i++) {
        line += ' ';
      }
      line += desc;
      console.log(line);
      cli.verticalSpace();
    }
  }
  cli.verticalSpace();
  cli.horizontalLine();
};

cli.responders.exit = () => {
  process.exit(0);
};

cli.responders.stats = () => {
  const stats = {
    'Load Average': os.loadavg().join(' '),
    'CPU Count': os.cpus().length,
    'Free Memory': os.freemem(),
    'Current Malloced Memory': v8.getHeapStatistics().malloced_memory,
    'Peak Malloced Memory': v8.getHeapStatistics().peak_malloced_memory,
    'Allocated Heap Used (%)': Math.round(
      (v8.getHeapStatistics().used_heap_size /
        v8.getHeapStatistics().total_heap_size) *
        100
    ),
    'Available Heap Allocated (%)': Math.round(
      (v8.getHeapStatistics().total_heap_size /
        v8.getHeapStatistics().heap_size_limit) *
        100
    ),
    Uptime: os.uptime() + ' seconds'
  };
  //show a header for stats
  cli.horizontalLine();
  cli.centered('SYSTEM STATISTICS');
  cli.horizontalLine();
  cli.verticalSpace(2);
  //log the stats
  for (let key in stats) {
    if (stats.hasOwnProperty(key)) {
      const desc = stats[key];
      let line = `\x1b[33m${key}\x1b[0m`;
      const padding = 60 - line.length;
      for (i = 0; i < padding; i++) {
        line += ' ';
      }
      line += desc;
      console.log(line);
      cli.verticalSpace();
    }
  }
  cli.verticalSpace();
  cli.horizontalLine();
};

cli.responders.listUsers = () => {
  list('users', (err, userEmails) => {
    cli.verticalSpace();
    if (!err && userEmails) {
      userEmails.forEach(email => {
        //read in data about that user
        read('users', email, (err, userData) => {
          if (!err && userData) {
            cli.verticalSpace();
            console.log(
              `Name: ${userData.firstName} ${userData.lastName}, Email: ${
                userData.email
              }`
            );
            cli.verticalSpace();
          }
        });
      });
    }
  });
};

cli.responders.recentUsers = () => {
  const yesterday = Date.now() - 24 * 60 * 60 * 1000;
  list('users', (err, userEmails) => {
    if (!err && userEmails) {
      userEmails.forEach(email => {
        read('users', email, (err, userData) => {
          if (!err && userData) {
            if (userData.joined_on >= yesterday) {
              cli.verticalSpace();
              console.log(
                `Name: ${userData.firstName} ${userData.lastName}, Email: ${
                  userData.email
                }`
              );
              cli.verticalSpace();
            }
          }
        });
      });
    }
  });
};

cli.responders.moreUserInfo = str => {
  //format of the string will be "...--userEmail" so if we split it on the "--" the userEmail will be [1]
  const arr = str.split('--');
  const userEmail =
    typeof arr[1] == 'string' && arr[1].trim().length > 0
      ? arr[1].trim()
      : false;
  if (userEmail) {
    //read in all the user data
    read('users', userEmail, (err, userData) => {
      if (!err && userData) {
        delete userData.password;
        cli.verticalSpace();
        console.dir(userData, { colors: true });
        cli.verticalSpace();
      } else {
        console.log('Could not find a user with that email address');
      }
    });
  }
};

cli.responders.listCarts = () => {
  list('cart', (err, cartIds) => {
    if (!err && cartIds) {
      //read in data about the cart
      cartIds.forEach(id => {
        read('cart', id, (err, cartData) => {
          if (!err && cartData) {
            cli.verticalSpace();
            console.log(
              `Cart ID: ${cartData.id}, Cart Owner: ${cartData.userEmail}`
            );
            cli.verticalSpace();
          }
        });
      });
    }
  });
};

cli.responders.moreCartInfo = str => {
  const arr = str.split('--');
  const cartId =
    typeof arr[1] == 'string' && arr[1].trim().length > 0
      ? arr[1].trim()
      : false;
  if (cartId) {
    read('cart', cartId, (err, cartData) => {
      if (!err && cartData) {
        cli.verticalSpace();
        console.dir(cartData, { colors: true });
        cli.verticalSpace();
      } else {
        console.log(`Error finding a cart with the ID "${cartId}"`);
      }
    });
  }
};

cli.responders.listOrders = () => {
  list('orders', (err, orderIds) => {
    if (!err && orderIds) {
      orderIds.forEach(id => {
        read('orders', id, (err, orderData) => {
          if (!err && orderData) {
            cli.verticalSpace();
            console.log(
              `Order ID: ${orderData.id}, Order Owner: ${orderData.userEmail}`
            );
            cli.verticalSpace();
          }
        });
      });
    }
  });
};

cli.responders.recentOrders = () => {
  const yesterday = Date.now() - 24 * 60 * 60 * 1000;
  list('orders', (err, orderIds) => {
    if (!err && orderIds) {
      orderIds.forEach(id => {
        read('orders', id, (err, orderData) => {
          if (!err && orderData) {
            if (orderData.ordered_on >= yesterday) {
              cli.verticalSpace();
              console.log(
                `Order ID: ${orderData.id}, Order Owner: ${orderData.userEmail}`
              );
              cli.verticalSpace();
            }
          }
        });
      });
    }
  });
};

cli.responders.moreOrderInfo = str => {
  const arr = str.split('--');
  const orderId =
    typeof arr[1] == 'string' && arr[1].trim().length > 0
      ? arr[1].trim()
      : false;
  if (orderId) {
    read('orders', orderId, (err, orderData) => {
      if (!err && orderData) {
        cli.verticalSpace();
        console.dir(orderData, { colors: true });
        cli.verticalSpace();
      } else {
        console.log(`Error finding an order with the ID "${orderId}"`);
      }
    });
  }
};

cli.responders.listMenu = () => {
  read('menuItems', 'menu', (err, menuItems) => {
    if (!err && menuItems) {
      menuItems.forEach(item => {
        console.log(`Item: ${item.name}, Price: $${item.price}`);
        cli.verticalSpace();
      });
    }
  });
};

cli.verticalSpace = lines => {
  lines = typeof lines == 'number' && lines > 0 ? lines : 1;
  for (i = 0; i < lines; i++) {
    console.log('');
  }
};

//print a dashed line the length of the screen
cli.horizontalLine = () => {
  const width = process.stdout.columns;
  let line = '';
  for (i = 0; i < width; i++) {
    line += '-';
  }
  console.log(line);
};

cli.centered = str => {
  str = typeof str == 'string' && str.trim().length > 0 ? str.trim() : '';
  const width = process.stdout.columns;
  const leftPadding = Math.floor((width - str.length) / 2);
  let line = '';
  for (i = 0; i < leftPadding; i++) {
    line += ' ';
  }
  line += str;
  console.log(line);
};

cli.handleInput = str => {
  str = typeof str == 'string' && str.trim().length > 0 ? str.trim() : false;
  if (str) {
    const uniqueInputs = [
      'man',
      'help',
      'exit',
      'stats',
      'list users',
      'recent users',
      'more user info',
      'list carts',
      'more cart info',
      'list orders',
      'recent orders',
      'more order info',
      'list menu'
    ];
    //see if the user input matches one of our commands
    let matchFound = false;
    uniqueInputs.some(input => {
      if (str.toLowerCase().indexOf(input) > -1) {
        matchFound = true;
        //emit an event for this command and include the full string
        e.emit(input, str);
        return true;
      }
    });

    if (!matchFound) {
      console.log('Command not recognized, please try again.');
    }
  }
};

cli.init = () => {
  //start the CLI
  const _interface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> '
  });

  //create initial prompt
  _interface.prompt();

  //this event will occur everytime a user enters a line of text
  _interface.on('line', str => {
    cli.handleInput(str);
    //re-initialize the prompt after each line
    _interface.prompt();
  });

  //handle when the user exits the process
  _interface.on('close', () => {
    process.exit(0);
  });

  console.log('\x1b[34m%s\x1b[0m', 'CLI is running...');
};

module.exports = cli;
