/**
 * Command Line Interface for the application
 */
const readline = require('readline');
const util = require('util');
const debug = util.debuglog('cli'); //NODE_DEBUG=cli node index.js
const events = require('events');
class _events extends events{};
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

// container for responses to user
cli.responders = {};

cli.responders.help = () => {
  const commands = {
    'exit': 'Exit the CLI and kill the rest of the application',
    'man': 'Show this help menu',
    'help': 'An alias to the "man" command',
    'stats': 'Show the stats on the underlying operating system and resource utilization',
    'list users': 'Show a list of all registered (not deleted) users in the system',
    'more user info --{userId}': 'Get detailed info about a specific user',
    'list carts': 'Show a list of all cart instances in the system',
    'more cart info --{cartId}': 'Get detailed info about a specific cart',
    'list orders': 'Show a list of all orders in the system',
    'more order info --{orderId}': 'Get detailed info about a specific order'
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
      for (i = 0; i < padding; i++){
        line+=" ";
      }
      line+= desc;
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
  console.log('stats...');
};

cli.responders.listUsers = () => {
  console.log('users...');
};

cli.responders.moreUserInfo = str => {
  console.log('more user...', str);
};

cli.responders.listCarts = () => {
  console.log('carts...');
};

cli.responders.moreCartInfo = str => {
  console.log('more cart...', str);
};

cli.responders.listOrders = () => {
  console.log('orders...');
};

cli.responders.moreOrderInfo = str => {
  console.log('more order...', str);
};

cli.verticalSpace = lines => {
  lines = typeof(lines) == 'number' && lines > 0 ? lines : 1;
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
  str = typeof(str) == 'string' && str.trim().length > 0 ? str.trim() : '';
  const width = process.stdout.columns;
  const leftPadding = Math.floor( (width - str.length) / 2);
  let line = '';
  for (i = 0; i < leftPadding; i++) {
    line += " ";
  }
  line += str;
  console.log(line);
};

cli.handleInput = str => {
  str = typeof(str) == 'string' && str.trim().length > 0 ? str.trim() : false;
  if (str) {
    const uniqueInputs = [
      'man',
      'help',
      'exit',
      'stats',
      'list users',
      'more user info',
      'list carts',
      'more cart info',
      'list orders',
      'more order info'
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

  console.log('\x1b[34m%s\x1b[0m', "CLI is running...");
};

module.exports = cli;