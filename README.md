# BTC Craps (Bitcoin Midnight)

**<a href="https://bitcoinmidnight.com" target="_blank" rel="noopener noreferrer">bitcoinmidnight.com</a>**

<a href="https://bitcoinmidnight.com" target="_blank" rel="noopener noreferrer">BTC Craps (Bitcoin Midnight)</a> shows the Bitcoin market as a craps table. The price is on the rail. Open interest is the money on Pass and Don't Pass. Liquidations are called beside it. The dice are thrown through that table, and four players bet the open interest the way a crew at a real table would.

The stacks are a picture of the market. Nobody is placing a wager, and the balances are a score for the session.

## The rail

[Binance](https://www.binance.com) (BTC-USDT) is on the left. [Coinbase](https://www.coinbase.com) (BTC-USD) is on the right. Each shows the last price, a green buy bar, and a red sell bar. The feeds are live.

The clock in the center is the Bitcoin block height, from [mempool.space](https://mempool.space), and the time since that height last changed. A new block flashes the height. If ten minutes pass with no new block, the elapsed time flashes. Tapping the clock also steps the dice color, which is described with the dice below.

**Open interest** sits at the bottom right. The first line is total open interest in BTC contracts for the aggregated BTCUSDT perpetual. Under it, Long % is labeled Pass and Short % is labeled Don't. Those percentages come from the long/short account ratio. The page re-reads this snapshot every 60 seconds. The snapshot itself is stored about twice every three minutes.

**Liquidations** sit at the bottom left. The countdown runs to the next five-minute mark. Under it are the last closed five-minute bar's long and short liquidations, each in BTC and in USD. A side at or above $10 million also gets a yellow ticker, longs first, then shorts. The liquidation figures change when a new five-minute bar closes. Price and volume stay live the whole time.

Open interest and liquidations are sampled from the [Coinalyze](https://coinalyze.net) API. See [Sources](#sources).

## Open interest on the felt

Contract count times the Bitcoin price is the dollar pool. Longs become Pass. Shorts become Don't Pass. Wolf, the Old Man, the Old Lady, and the Cat together hold that whole pool. The shooter's own chips are a separate bet and are left out of this split.

While a point is up, place, lay, and one-roll bets are paid out of those line stacks, so the stacks still on the line are what each player has left. When they add to a bet they call it, and their eyes glance at those spots until the next throw.

Place bets and lays are off on the come-out: the chips can stay, and they do not win or lose until a point is up. A 7-out takes every extra bet down.

### Chip colors

At the normal scale:

| Color | Value |
| --- | --- |
| White | $500,000 |
| Red | $2,500,000 |
| Green | $12,500,000 |
| Blue | $25,000,000 |
| Black | $50,000,000 |

Five whites make a red, five reds a green, two greens a blue, and two blues a black. Each bet is at most two columns of ten. If the biggest bet would need more than twenty black chips ($1 billion), every color is worth more by the same factor, so the stacks stay the same height and the ratios between colors stay put. A small LAY button on top of a column marks a lay and has no dollar value.

A place unit is one red ($2.5 million) on 4, 5, 9, and 10, and one red plus one white ($3 million) on 6 and 8. A lay unit is one red on 4 and 10, and one red plus one white on 5, 6, 8, and 9. Place bets pay the usual 9:5, 7:5, and 7:6. Lays pay the usual don't odds. Hard 4 and 10 pay 7:1. Hard 6 and 8 pay 9:1.

### The four players

Each player takes a fixed share of the long pool for Pass and of the short pool for Don't Pass:

| Player | Stance | Pass (longs) | Don't Pass (shorts) |
| --- | --- | --- | --- |
| Wolf | Bearish | 10% | 40% |
| Old Man | Semi-bearish | 20% | 30% |
| Old Lady | Semi-bullish | 30% | 20% |
| Cat | Bullish | 40% | 10% |

When longs and shorts are equal, that is the same as Wolf 20/80, Old Man 40/60, Old Lady 60/40, and Cat 80/20 on their own money. A 57/43 market shifts the dollar ratio, because Pass is sized from the long share and Don't Pass from the short share.

They only book a bet when the line purse can still pay for it. Hot and cold numbers are read from the same last-36 rolls that draw the back-wall plate.

**Cat, bullish.** While a point is up she places 6 and 8 from Pass, skipping whichever of those is the point. Once the recent window has at least three rolls, any other place number that is tied for the busiest count, and has shown at least three times, gets another unit. A 6 or 8 that is already placed is pressed by that unit. A 4, 5, 9, or 10 is a new one-red place.

**Old Lady, semi-bullish.** While a point is up she plays the inside from Pass: 5, 6, 8, and 9, except the point. She also books hard 6 and hard 8 for one red each. On a new point the hardways start at one red. If the same point is still up, she keeps the amount already on each hardway when she can still afford it. When a 6 or an 8 repeats and the point stays up, she presses that inside number by one six-unit and that hardway by one red, if she had them up already and the purse can pay. The inside on 6 and 8 can also carry a larger amount forward while that same point stays up.

**Old Man, semi-bearish.** While a point is up he books an iron cross from Pass, all or nothing: place 5, 6, and 8 except the point, plus one red on the field. The field is a one-roll bet. It wins on 2, 3, 4, 9, 10, 11, and 12, loses on 5, 6, 7, and 8, and 2 and 12 pay 3:1. After the other bets, if his Don't Pass purse is larger than his Pass purse he places the point from Don't Pass for the difference. If Pass is larger, he lays the point from Pass for the difference. After three rolls with a point up, and once the iron cross and the field are both booked, he bets a horn high on the horn number that has shown at least three times. The high number gets two whites and the other three horn numbers get one white each, which is one red in total. A tie picks one of the tied numbers and keeps that choice for the window. Horn 2 and 12 pay 30:1. Horn 3 and 11 pay 15:1. The horn is bet again every roll, including on the come-out once the iron cross is still up and those three point-rolls have been seen.

**Wolf, bearish.** While a point is up he places across from Pass: every place number except the point, all or nothing. From Don't Pass he lays the coldest place numbers, the ones rolled fewer than three times in a window of at least three rolls, skipping the point. Several numbers tied for that low count are all laid, and each column wears a LAY button. He covers the point the same way the Old Man does, placing it from the heavier Don't Pass side or laying it from the heavier Pass side.

On the come-out, place, inside, iron cross, across, and lay bets stay up when the new purse can still pay them. They are off until the next point. Hardways come down. The field is bet fresh each roll and only while a point is up. A 7-out clears the extras.

### All Small, All Tall, and Make 'Em All

Three squares sit on the right of the felt. All Small pays 30 to 1 for collecting 2, 3, 4, 5, and 6. All Tall pays 30 to 1 for collecting 8, 9, 10, 11, and 12. Make 'Em All pays 150 to 1 for collecting both sets in the same hand. The shooter keeps one red, $2,500,000, on Make 'Em All while that bet is working. All Tall and All Small show a dollar line on the Coinbase side only while chips are sitting on those squares.

The hand starts on the first point number and stays open through later come-outs. Each total counts once. A repeat does not add another mark. A 7 after the hand has started clears it. A 7 before any point number leaves it alone. When a set is completed, the dice result reads All Small Winner, All Tall Winner, or Make 'Em All Winner, with the odds.

On the 36-roll plate, the orange columns stay the last 36 totals. The blue circles behind the digits are this bonus hand, which is a different count. A circle appears under a number once that total has been collected. Seven never gets one. When Small, Tall, or Make 'Em All hits, those numbers blink blue for 10 seconds, then sit solid. Make 'Em All blinks 2 through 6 and 8 through 12 together. A 7 takes the circles down with the hand, and a win brings the plate up.

## The players

### Eyes

In the air, all four follow the dice: left, center, or right. They hold a look until a die clearly crosses into the next zone. Split dice use the split painting. When a player adds a bet, that player glances across the spots they just booked until the next throw.

### Pupils

After a point is made or a 7-out, each player's pupils show that point's result in bitcoin. Wolf and the Old Man win with a dollar. The Cat and the Old Lady win with a bitcoin. A loss is a skull for everyone. Come-out rolls leave the pupils alone. The marks leave together when the floating numbers finish, or as soon as the next throw starts.

### Balances

Under each player, after their first win or loss: running BTC, and that same stack priced in USD at the latest decision. Green is ahead, red is behind, cream is flat. The number floats up from the rack on the roll it happened, this roll only, and fades on the way up. A result that rounds to 0 BTC stays on the standing total and does not float. The total counts the line that is still out and the profile bets, and it is remembered in the browser.

## The shooter

The shooter is a fixed bettor at the table, separate from the four open-interest players and separate from Shooter mode, which is you taking the dice. The shooter's chips are one red each, $2,500,000, and they stay that size. Wins and losses land on the P/L line under Binance.

One red stays on Pass and one red stays on Don't Pass through every decision. One red stays on Make 'Em All while that bet is working. Nothing from the shooter sits on All Tall, All Small, or odds, and none of this comes out of open interest.

Pass and Don't Pass cancel each other on a normal decision. The pair moves the P/L on a come-out 12, where Pass loses and Don't Pass pushes, so the shooter is down one red. Make 'Em All is the bet that can pay. Completing both sets pays 150 to 1 and takes that chip down. A 7 while the chip is up loses the red and puts a new one up on the same roll. A 7 after a win only puts the next red up.

The P/L stays hidden until the first win or loss, then shows BTC and USD. The letters P/L stay white. The figures are green when the shooter is ahead, red when behind, and white when flat. USD is the running sum of those chip results. BTC is each roll's dollar result divided by the Bitcoin price on that roll, then added up. Both numbers are remembered in the browser.

**Roll Streak** sits under the P/L, as `Roll Streak 10 / 36`: this hand, then the longest hand so far. Every decided roll counts, including the come-out. Making the point does not end the hand. A 7-out resets the first number to 0 and is not itself counted. The record stays, and it is the number the browser keeps. Once the hand goes past 10, the whole label turns rainbow.

**Hot Shooter.** The first time a hand passes 10, a rainbow ticker scrolls "Hot Shooter!" above the liquidation line for about 13 seconds. It plays once for that hand. After the streak falls back to 10 or below, including a 7-out, the next hand can set it off again.

## The dice

The dice bounce off the felt, and the spin kicks that bounce sideways. They also bounce off each other while both are still moving. The hit pushes them apart and takes some of the spin off.

A moving die that meets a chip stack bounces off it. The chips from the height of the hit on up peel off and slide in the direction the die was going. A softer hit only leans the column. Loose chips then bounce off the dice, each other, the puck, and the rails, and the columns stand back up after the dice return. The shooter's two reds at the near rail stay clear on the way out and collide once a die has crossed the middle of the felt. Every other stack collides the whole way.

The puck is a solid disc, OFF in the Don't Come bar or ON on the point. It never moves. A die or a loose chip that is low enough to meet it bounces off.

The side rails and the front rail send a die back onto the felt. The hit keeps part of the speed, changes the angle a little, and adds spin. The back rail does the same when the die arrives at or below the height of the wall, including along the curved corners. That bounce is what counts as hitting the back wall.

A die that reaches the back rail above the wall goes over it. It holds there for a moment, then leaves the table. If either die goes over, the throw is **No Roll!** The faces are not counted, the point stays where it was, and nobody is paid. A throw that dies short of the back wall is a no-roll as well. In Shooter mode both dice have to bounce on that wall for the roll to count.

### Volume

In **Auto**, the last 3 seconds of trade size set the toss. [Binance](https://www.binance.com) buying sets how hard the dice go down the table. [Coinbase](https://www.coinbase.com) buying sets the loft, plus a fixed extra lift so a quiet tape still clears the felt. The launch angle is those two speeds together. Binance selling spins the left die. Coinbase selling spins the right die. A dice set that is on axis averages those spins so the chosen faces stay put if nothing hits them.

### Shooter mode

**Shooter** holds the dice until you throw. Turning it on raises a "here comes a new shooter" banner. **Regular** is a flick: speed sets how far, lean sets the side spin, and both dice have to reach the back wall. **Precision** sets the landing spot, the angle, and the spin first, then the flick adds the lean. Volume stays on the rail in both styles and does not launch the dice. Taking the dice also hides the candle chart behind the table.

### Dice color

Seven choices, in this order: Midnight, Orange, Red, Blue, Green, Purple, Rainbow. Midnight is the default.

Each tap on the block-height clock steps to the next color, and after Rainbow it returns to Midnight. The Dice Control panel has a Dice Color menu that jumps straight to any of the seven. Both controls change the same pair of dice, including the ghost dice in Precision, and the choice is remembered in the browser.

Midnight and Orange share the Bitcoin orange. Midnight is solid, and the ace on the left die carries a bitcoin mark while the ace on the right die carries a mask. Orange, Red, Blue, Green, and Purple are translucent, with ordinary pips. Rainbow keeps both dice on the same color and walks them through red, orange, yellow, green, blue, indigo, and purple.

### Dice control

The side panel sets one dice set for the come-out and one for the point, gripped side by side or stacked. The sets are Random, All Sevens, Hard Way, 3 V, 2 V, 6/5 – 5/4, Straight Sixes, Crossed Sixes, 6/5 – 4/4, 6/4 – 5/6, 6/5 – 5/6, and 1364. Random gives every hold a new face. Any other set aims at a face pair, and the aim holds only while the dice stay together and on axis. A chip, a rail, or the other die can knock them off it.

### Dice Control histogram

This chart is how the chosen settings have actually landed in this browser. Totals run from 2 through 12. The white line across the middle of every column is a fair pair of dice: the share that total would get, with 7 the most likely and 2 and 12 the least. The orange bar is how far these throws have landed from that share. A bar above the line means that total is coming up more often than fair. A bar below means less often. A faded bar can still be ordinary luck. A solid bar has moved far enough that luck is a poor explanation.

A second, brighter mark appears in the same columns when the chart is for any set other than Random and this browser already has Random throws to compare. That mark is where the Random throws landed for that total, on the same scale. When those throws are close to fair, the mark sits on the center line.

Under the columns, hard 4, 6, 8, and 10 show how many doubles came up, how many a fair pair would have produced in this many rolls, and, when Random throws exist, that same count from Random. If the come-out and the point use different sets, the chart splits in two. The counts are remembered in the browser.

### The 36-roll plate

The plate on the back wall is a different chart. It is the last 36 counted totals, 2 through 12, drawn as orange columns. It stays up for 5 minutes, then drops away for 5 minutes. The same window is what the Cat, the Wolf, and the Old Man read when they decide which numbers are hot or cold. The blue circles on the digits belong to All Small, All Tall, and Make 'Em All, described above.

## Behind the table

While Auto has the dice, a Binance 1-minute candle chart fades in behind the table for 30 seconds every 3 minutes. Shooter mode leaves the chart down so the felt stays clear for the throw.

## Sources

Open interest, the long/short account ratio, and liquidation history for the aggregated BTCUSDT perpetual are provided by [Coinalyze](https://coinalyze.net). The [Coinalyze API](https://api.coinalyze.net/v1/doc/) is free. Their terms ask that public use of the data cite Coinalyze and link to the site, which this page does.

Last price and the buy/sell tape come from [Binance](https://www.binance.com) and [Coinbase](https://www.coinbase.com). The block clock reads the chain tip from [mempool.space](https://mempool.space).

## Run it locally

From `web/`:

```bash
npm install
npm run dev
```

The dev server opens the table with live Binance and Coinbase prices. Open interest falls back to a built-in sample until a local snapshot is available.

For a live open-interest and liquidation snapshot, create a free key on [Coinalyze](https://coinalyze.net) and put it in `web/worker/.dev.vars`:

```bash
COINALYZE_API_KEY=your_key_here
```

Leave that file uncommitted. Then, again from `web/`:

```bash
npm run oi:dev
```

That starts the local worker and refreshes `/oi` once a minute. The dev server proxies `/oi` to it. The worker stores two of every three minutes. The key stays on the worker. The page only reads the snapshot.
