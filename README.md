# Bot used by Brazil in /r/place

This was develop in a rush during a weekend while fighting Reddit devs and helping coordinating a campaign on /r/place. Don't judge me.

It downloads this image automatically and draws it:

![Template](https://raw.githubusercontent.com/brunocassol/sandboxandutils/master/template.png)

# How to use
Press F12 on Chrome and paste this on console:

$.getScript("https://rawgit.com/brunocassol/sandboxandutils/master/bot.js")

# Better than other bots?
Differently from other bots, it uses `window.r.place.state` to patrol pixels from the canvas instead of flooding `https://www.reddit.com/api/place/pixel.json?x=&y=`. No flood = no ban.

# Bonus
`converter.js` is an image to template converter.

I also made this tool to convert images to javascript template format. It helps debugging and has a secret feature: encoding numbers to an image.

It also demonstrates how the bot encrypts coordinates inside an image. `test.png` is actually X,Y coordinates encoded in a PNG.

# Screenshots

![Template](https://raw.githubusercontent.com/brunocassol/sandboxandutils/master/demo.png)

# License
MIT