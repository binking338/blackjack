function Card(suit, num) {
	this.suit = suit;
	this.num = num;
	Card.prototype.value = function() {
		var val = 'A,2,3,4,5,6,7,8,9,10,J,Q,K'.split(',')
			.indexOf(this.num);
		return val + 1;
	}
};

Card.prototype.toString = function() {
	return this.suit + ' ' + this.num;
};

Card.generate = function(noJoker) {
	var cards = [];
	"♠️,♥️,♦️,♣️".split(',').forEach(function(suit) {
		'A,2,3,4,5,6,7,8,9,10,J,Q,K'.split(',').forEach(function(num) {
			cards.push(new Card(suit, num));
		});
	});
	if (!noJoker) {
		cards.push(new Card('b', "Joker"));
		cards.push(new Card('r', 'Joker'));
	}
	return cards;
}

function Pokers(n) {
	this.cards = [];
	while (n--) {
		this.cards = this.cards.concat(Card.generate(true));
	}
}

Pokers.prototype.shuffle = function() {
	var t;
	for (var i = this.cards.length - 1; i > 0; i--) {
		var p = Math.floor(Math.random() * i);
		t = this.cards[p];
		this.cards[p] = this.cards[i];
		this.cards[i] = t;
	}
	return this;
};

Pokers.prototype.shiftCard = function(n) {
	if (this.cards.length < n) return null;
	var t = [];
	n = n || 1;
	while (n--) {
		t.push(this.cards.shift());
	}
	return n == 1 ? t[0] : t;
};

function Player(name) {
	this.name = name;
	this.openCards = [];
	this.coverCards = [];
}
Player.prototype.show = function() {
	var txt = '';
	var cards = [];
	txt += '[' + this.stateName() + ' ' + this.points() + '] ' + this.name + ' : ';

	this.coverCards.forEach(function(c) {
		cards.push('[**]');
	});

	this.openCards.forEach(function(c) {
		cards.push(c.toString());
	});

	txt += cards.join(',');
	console.log(txt);
	return this;
};
Player.prototype.accept = function(cards) {
	this.coverCards = this.coverCards.concat(cards);
	return this;
};
Player.prototype.open = function(n) {
	n = n || 1;
	while (n--) {
		this.openCards.push(this.coverCards.pop())
	}
	return this;
};
Player.prototype.discard = function() {
	this.openCards = [];
	this.coverCards = [];
	return this;
};

function BlackJack(bankerName) {
	this.players = [];
	this.newDecks(1)
		.join(new Player(bankerName));
}

BlackJack.prototype.getPlayer = function(player) {
	if (typeof(player) === 'string') {
		player = this.players.find(function(p) {
			return p.name == player;
		});
	}
	return player;
};
BlackJack.prototype.banker = function() {
	return this.players[0];
}

BlackJack.prototype.newDecks = function(n) {
	this.pokers = (new Pokers(n)).shuffle();
	return this;
};

BlackJack.prototype.join = function(player) {
	this.players.push(player);
	return this;
};

BlackJack.prototype.shiftCard = function(n) {
	var card = this.pokers.shiftCard(n);
	if (!card) {
		this.newDecks(1);
		card = this.pokers.shiftCard(n);
	}
	return card;
};

BlackJack.prototype.round = function() {
	console.log('new round');
	console.log('---------------------------------');
	this.dealround = 1;
	this.roundover = false;
	this.players.forEach(function(p, i) {
		p.onround();
		if (i === 0) {
			p.accept(this.pokers.shiftCard(1));
		} else {
			p.accept(this.pokers.shiftCard(1)).open(1);
		}
	}, this);
	this.players.forEach(function(p, i) {
		p.accept(this.pokers.shiftCard(1)).open(1).judge().show();
	}, this);
	return this;
};


BlackJack.prototype.deal = function() {
	if (this.roundover) return;
	var ready = this.players.every(function(player) {
		return player.dealround === this.dealround;
	}, this);
	if (!ready) {
		console.log('deal round ' + this.dealround + ' : there are some players not called!');
	} else {
		this.players.filter(function(player) {
			return player.state === Player.states.hit;
		}).forEach(function(player) {
			player.accept(this.pokers.shiftCard(1)).open(1).judge();
		}, this);

		var over = this.players.every(function(player) {
			return player.state !== Player.states.hit;
		});

		console.log('');
		if (over) {
			this.banker().open();
			this.players.forEach(function(player) {
				player.judge(this.banker());
			}, this);
			this.roundover = true;
			console.log('deal round ' + this.dealround + ' : game over!');
			console.log('---------------------------------');
		} else {
			console.log('deal round ' + this.dealround + ' :');
			console.log('---------------------------------');
		}

		this.players.forEach(function(player) {
			player.show();
		}, this);

		if (over) {
			console.log('');
		}
		this.dealround++;
	}
	return this;
};

Player.states = {
	banker: -2,
	lose: -1,
	draw: 0,
	win: 1,
	hit: 2,
	stand: 3,
	bust: 4,
	blackjack: 5
};

Player.prototype.stateName = function() {
	switch (this.state) {
		case -2:
			return 'banker';
		case -1:
			return 'lose';
		case 0:
			return 'draw';
		case 1:
			return 'win';
		case 2:
			return 'hit';
		case 3:
			return 'stand';
		case 4:
			return 'bust';
		case 5:
			return 'blackjack';
	}
};
Player.prototype.stand = function() {
	this.state = Player.states.stand;
	this.dealround++;
	return this;
};
Player.prototype.hit = function() {
	this.dealround++;
	return this;
};
Player.prototype.none = function() {
	this.dealround++;
	return this;
};
Player.prototype.points = function() {
	var hasA = false;
	var points = this.coverCards.concat(this.openCards).reduce(function(r, c) {
		var val = c.value();
		if (val > 10) {
			val = 10;
		}
		if (val == 1) {
			hasA = true;
		}
		return r + val;
	}, 0);
	if (points <= 11 && hasA) {
		points += 10;
	}
	return points;
};
Player.prototype.judge = function(banker) {
	var points = this.points();
	if (banker) {
		var bpoints = banker.points();

		if (this === banker) {
			this.state = Player.states.banker;
		} else if (points > 21) {
			this.state = Player.states.lose;
		} else if (bpoints > 21) {
			this.state = Player.states.win;
		} else if (points === bpoints) {
			this.state = Player.states.draw;
		} else if (points > bpoints) {
			this.state = Player.states.win;
		} else {
			this.state = Player.states.lose;
		}
	} else {
		if (points == 21) {
			this.state = Player.states.blackjack;
			//console.log(this.name + " : black jack!");
		} else if (points > 21) {
			this.state = Player.states.bust;
			//console.log(this.name + " : Bust!");
		} else {
			//console.log(this.name + " : continue with " + points);
		}
	}
	return this;
};
Player.prototype.onround = function() {
	this.discard();
	this.state = Player.states.hit;
	this.dealround = 0;
	return this;
};

var bk = new Player('binking');
var panda = new Player('panda');
var BJ = (new BlackJack('banker'))
	.join(bk)
	.join(panda);

function robot() {
	BJ.round();
	while (!BJ.roundover) {
		BJ.players.forEach(function(player) {
			if (player.state === Player.states.hit) {
				if (player.points() >= 17) {
					player.stand();
				} else {
					player.hit();
				}
			} else {
				player.none();
			}
		});
		BJ.deal();
	}
}
var n = 5;
while (n--) {
	robot();
}
// console.log(BJ.players);