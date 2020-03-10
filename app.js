var express         = require("express");
    app             = express();
    request         = require("request");
    bodyParser      = require("body-parser");
    mongoose        = require("mongoose");
    passport        = require("passport");
    localStrategy   = require("passport-local");
    User            = require("./models/user");    
    Anime           = require("./models/anime");


app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));

mongoose.connect("mongodb://localhost/anime_app", {useNewUrlParser:true, useUnifiedTopology: true});
app.use(bodyParser.urlencoded({extended: true}));

//Passport Configuration

app.use(require("express-session")({
    secret: "Anime website schedule for anime lovers",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
    res.locals.curr_user = req.user;
    next();
});


var base_url = "https://api.jikan.moe/v3/season/";
var details_url = "https://api.jikan.moe/v3/anime/";

var today = new Date();
var curr_year = today.getFullYear();
var curr_month = today.getMonth();

if (curr_month < 3) {
    var season = "winter";    
}
else if (curr_month < 6) {
    season = "spring";
}
else if (curr_month < 9) {
    season = "summer";
}
else if (curr_month < 11) {
    season = "fall";
}
else {
    season = "winter";
    curr_year = curr_year + 1;
}

app.get("/", function(req, res){
    var  redirect_url = "/season/" + curr_year + "/" + season
    res.redirect(redirect_url);
});

app.get("/season/:year/:aniseason", function(req, res){  
    var a_year = req.params.year;
    var aniseason = req.params.aniseason;  
    request(base_url + a_year + "/" + aniseason, function(error, response, body){
        if(!error && response.statusCode == 200){
            var data = JSON.parse(body);
            res.render("index", {data: data, curr_year: curr_year, today : today, aniseason: aniseason, a_year: a_year, season: season});         
        }
    });
});

app.get("/anime/:id", function(req, res){
    var id = req.params.id;  
    request(details_url + id, function(error, response, body){
        if(!error && response.statusCode == 200){
            var detailsdata = JSON.parse(body);  
            res.render("anime", {detailsdata: detailsdata, curr_year: curr_year, season: season});  
        }
    });
});

//Schedule route

app.get("/schedule/:UserName/:scheduleYear/:scheduleSeason", isLogggedIn, function(req, res){
    var UserName = req.params.UserName;
    var scheduleYear = req.params.scheduleYear;
    var scheduleSeason = req.params.scheduleSeason;
    User.findOne({username: UserName}, function(err, userSchedule){
        if(err){
            console.log(err);
        } else {
            res.render("schedule", {userSchedule: userSchedule, scheduleYear: scheduleYear, scheduleSeason: scheduleSeason, curr_year: curr_year});
        }
    });
});


app.post("/schedule/:UserName", function(req, res){
    var UserName = req.params.UserName;
    var arr = JSON.parse(req.body.dataArray);
    
    arr.forEach(function(item) {
        User.findOne({username: UserName}, function(err, userFound){
            if(err){
                console.log(err);
                res.redirect("/");
            } else {            
                Anime.findOne({id: item.aniId}, function(err, anime){            
                    if(anime == null){
                        Anime.create({id: item.aniId, title: item.anititle, image_url: item.aniImage, day: item.aniDay, season: item.currSeason, year: item.currYear}, function(err, anime){
                            if(err){
                                console.log(err);
                            } else {
                                userFound.animes.push(anime);
                                userFound.save();                            
                            }
                        })
                    } else {
                        User.findOne({username: UserName, 'animes.title': item.anititle}, function(err, foundAnime){
                            if(foundAnime == null){
                                userFound.animes.push(anime);
                                userFound.save();
                            }
                        });                    
                    }
                });   
            }
        });
    });
    setTimeout(function(){
        res.redirect("/schedule/" + UserName + "/" + curr_year + "/" + season);
    },1500);
});

//Auth Routes

app.get("/register", function(req, res){
    res.render("register", {curr_year: curr_year});
});
app.post("/register", function(req, res){
    var newUser = new User({username: req.body.username});
    User.register(newUser, req.body.password, function(err, user){
        if(err){
            console.log(err);
            return res.render("register", {curr_year: curr_year})
        }
        passport.authenticate("local")(req, res, function(){
            res.redirect("/");
        });
    });
});

//Login form

app.get("/login", function(req, res){
    res.render("login", {curr_year: curr_year});
});
app.post("/login", passport.authenticate("local", 
    {
        successRedirect: "/",
        failureRedirect: "/login"
    }), function(req, res){
});

//logout route

app.get("/logout", function(req, res){
    req.logOut();
    res.redirect("/");
});

function isLogggedIn(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    res.redirect("/login");
}

app.listen(3000, function(){
    console.log("Server has been started!!!")
});