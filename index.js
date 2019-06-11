const config = require("./config.json");

const Discord = require("discord.js");
const client = new Discord.Client();
const blocktrail = require('blocktrail-sdk');
const bclient = blocktrail.BlocktrailSDK({apiKey: config.blocktrailApiKey, apiSecret: config.blocktrailApiSecret, network: "BTC", testnet: false});

const sql = require("sqlite");
sql.open("./dwallet.sqlite");

client.on("ready", () => {
  client.user.setActivity(`dw!help on ${client.guilds.size} servers`);
  console.log("Start succesfull!");
});

client.on("guildCreate", guild => {
	client.user.setActivity(`dw!help on ${client.guilds.size} servers`);
	client.channels.get('487560853168717834').send(`:arrow_up: New guild joined: ${guild.name} (id: ${guild.id}).\n This guild has ${guild.memberCount} members!`);
});

client.on("guildDelete", guild => {
  client.user.setGame(`dw!help on ${client.guilds.size} servers`);
	client.channels.get('487560853168717834').send(`:arrow_down: I have been removed from: ${guild.name} (id: ${guild.id})`);
});

function makeid() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (var i = 0; i < 15; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
}

client.on("message", message => {

  let authorr = `${message.author}`;

  if (message.author.bot) return;
  if (message.channel.type !== "text") return;
  const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();
  const prefix = config.prefix;

  if (message.content.startsWith(prefix + "support")) {
    message.channel.send("https://discord.gg/Kvff5jA");
  }

  if (message.content.startsWith(prefix + "create")) {
    sql.get(`SELECT * FROM User WHERE Name ="${authorr}"`).then(row => {
      if (!row) {
        const WPassword = makeid();
        const WName = makeid();
        sql.run("INSERT INTO User (Name, WPassword, WName) VALUES (?, ?, ?)", [authorr, WPassword, WName]);
        bclient.createNewWallet(WName, WPassword, function(err, wallet, backupInfo) {
          message.reply('Do you want your backup seed? **(Not recommended) (Very unsecure)**\n Type `yes` to receive your backup seed. \n Type `no` to continue without backup seed');
          const collector = new Discord.MessageCollector(message.channel, m => m.author.id === message.author.id, { time: 10000 });
          collector.on('collect', message => {
            if (message.content == "yes") {
                message.reply('Check your DM\'s ');
                message.author.send("Your backup seed: " + backupInfo.backupSeed);
            } else if (message.content == "no") {
            }
          })
        });
        message.reply('You\'re Wallet has been created, type `dw!wallet` to open your wallet');
      }else {
        message.reply('You already own a Wallet');
      }
    }).catch(() => {console.error;});
  }

  if (message.content.startsWith(prefix + "wallet")) {
    sql.get(`SELECT * FROM User WHERE Name ="${authorr}"`).then(row => {
      if (!row) {
        message.reply('Please create a wallet with `dw!create`');
      }else {
        bclient.initWallet(row.WName, row.WPassword,
          function(err, wallet) {
            wallet.getBalance(
              function(err, confirmedBalance, unconfirmedBalance) {
                //message.reply('Balance:' + blocktrail.toBTC(confirmedBalance) + '\nUnconfirmed Balance' + blocktrail.toBTC(unconfirmedBalance));
                let balance = blocktrail.toBTC(confirmedBalance);
                let ubalance = blocktrail.toBTC(unconfirmedBalance);
                const embed = new Discord.RichEmbed()
                  .setTitle(message.author.username + "\'s wallet")
                  .setColor(0x00ffff)
                  .setThumbnail(message.author.displayAvatarURL)
                  .setTimestamp()
                  .addField("Balance", balance + ' BTC', true)
      						.addField("Unconfirmed Balance", ubalance + ' BTC', true)
                message.channel.send({embed});
              }
            )
          });
      }
    }).catch(() => {console.error;});
  }

  if (message.content.startsWith(prefix + "receive" || "charge")) {

    sql.get(`SELECT * FROM User WHERE Name ="${authorr}"`).then(row => {
      if (!row) {
        message.reply('Please create a wallet with `dw!create`');
      }else {
        bclient.initWallet(row.WName, row.WPassword,
          function(err, wallet) {
            wallet.getNewAddress(function(err, address) {message.reply('Here is your address to recive BTC **' + address + '**')});
          });
      }
    }).catch(() => {console.error;});
  }

  if (message.content.startsWith(prefix + "send")) {
    let raddress = args[1];
    let value = blocktrail.toSatoshi(args[0]);
    if (!value) {
      message.reply('Please enter a valid amount')
    }else {
      if (!raddress) {
        message.reply('Please enter a valid address')
      }else {
        sql.get(`SELECT * FROM User WHERE Name ="${authorr}"`).then(row => {
          if (!row) {
            message.reply('Please create a wallet with `dw!create`');
          }else {
            bclient.initWallet(row.WName, row.WPassword,
              function(err, wallet) {
                wallet.pay({ [raddress]: value},
                function(err, result) {
                  if (!result) {
                    message.reply(err.message);
                  }else {
                    message.reply('You succesfully sent ' + args[0] +' BTC to ' + args[1] );
                  }

                });
              });
          }
        }).catch(() => {console.error;});
      }
    }

  }


  if (message.content.startsWith(prefix + "help")) {
    message.channel.send({embed: {
    color: 15158332,
    title: ":question: Help",
    fields: [
      {
        name: "dw!create",
        value: "Creates your BTC wallet."
      },
      {
        name: "dw!wallet",
        value: "See your wallet balance."
      },
      {
        name: "dw!receive",
        value: "Get an address to receive BTC."
      },
      {
        name: "dw!send",
        value: "Send BTC to an address (Ex.: dw!send 1 2N8NRiZMqNUd93oNZ8go1BKoS2btLAaCrTS)."
      },
      {
        name: "dw!support",
        value: "Get a link for the official Discord Wallet support server."
      },
    ],
    }
  });
 }



  });

client.login(config.token);
