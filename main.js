
const ctx = myCanvas.getContext("2d"); 

//A mass is 10^22, distance 10^6, speed 10^3, size is arbitrary
//EM charge is 10^-19 (electron = 1.6x), distance 10^-11, speed 10^3, size is arbitrary

var mode = 0; //0 astro 1 EM

//universe constants, time constant
const k = 0.67230349899;
var dt = 1; //for 1 -> 66391.5789474 times speed
var dtmemory = dt;

//scaling values for the simulation
var scale = {
    general: 1/0.004,
    planet: 2,
    truesize: 1, //0 actual size 1 scaled size 2 normalized size
    anchor:
    {
        tx: myCanvas.width/2,
        ty: myCanvas.height/2,
        x: myCanvas.width/2,
        y: myCanvas.height/2
    },
    arrow: {
        acc: 4000,
        vel: 40
    }
};

//visual UI anchor
var anchor = {x: myCanvas.width/2, y: myCanvas.height/2};

//full scale canvas
myCanvas.width = window.innerWidth;
myCanvas.height = window.innerHeight;

//created object preview on the right side
var previewObj = {
    x: myCanvas.width*0.85,
    y: myCanvas.height/3 + myCanvas.height/6,
    mass: 0,
    sign: 1,
    color: "#eb3434"
};
var drawpr = false; //draw preview object

//visuals for acceleration and velocity vectors
var showacc = true;
var showvel = true;

//dragging values
let dragpt = false; //drag preview object
let dragview = false; //drag the whole simulation
let ms = {
    dx: 0,
    dy: 0,
    dxv: 0,
    dyv: 0
}

//planet buttons
var planetOverlay = -1;

//planet/charge class
class planet {
    constructor(x, y, mass, color, sign, vel = {x: 0, y: 0}, acc = {x: 0, y: 0}){
        this.x = x;
        this.y = y;
        this.mass = mass;
        this.sign = sign; //1 or -1 for charged particles, 1 for planets
        this.vel = vel; //as an object with an x and y value
        this.acc = acc; //as an object with an x and y value
        this.color = color;
    }
    updateAcceleration(){
        this.acc.x = 0;
        this.acc.y = 0;
        for(let i of planets){
            if(i.mass != 0){
                //for every planet, the distance squared to that planet is calculated
                let distsq = (this.x - i.x)**2 + (this.y - i.y)**2;
                if(distsq != 0){
                    if(Math.sqrt(distsq) >= Math.cbrt(this.mass)*2+Math.cbrt(i.mass)*2){
                        //magnitude of acceleration calculation from Newton's formula
                        let instacc = (i.mass * k) / distsq; 

                        if(distsq >= 25){
                            let away = 1;
                            if(mode == 1 && i.sign == this.sign) away = -1;
                            //acceleration direction calculations from the angle to the target object
                            this.acc.x += away * instacc * Math.cos(Math.atan2((i.y - this.y), (i.x - this.x)));
                            this.acc.y += away * instacc * Math.sin(Math.atan2((i.y - this.y), (i.x - this.x)));
                        }
                    }
                    else if(mode == 0){ //planet collision
                        //object i is the new object which represents both of the collided objects into one, 
                        //the planet this is deleted (so no more calculations are done with it)
                        
                        i.x -= Math.cos(Math.atan2((i.y - this.y), (i.x - this.x)))*Math.sqrt(distsq)/2;
                        i.y -= Math.sin(Math.atan2((i.y - this.y), (i.x - this.x)))*Math.sqrt(distsq)/2;

                        //momentum transfer
                        i.vel.x = (this.vel.x * this.mass + i.vel.x + i.mass)/(i.mass + this.mass);
                        i.vel.y = (this.vel.y * this.mass + i.vel.y + i.mass)/(i.mass + this.mass);

                        i.mass += this.mass;
                        i.color = blend_colors(this.color, i.color);
                        
                        planets.delete(this);
                    }
                }
            }
        }
        //draw acceleration arrow
        if(showacc) drawArrow(this.x, this.y, scale.arrow.acc*Math.sqrt(this.acc.x**2 + this.acc.y**2), Math.atan2(this.acc.y, this.acc.x));
    }
    updateVelocity(){
        //velocity = acceleration * time resolution
        this.vel.x += this.acc.x * dt;
        this.vel.y += this.acc.y * dt;
        //draw velocity arrow
        if(showvel) drawArrow(this.x, this.y, scale.arrow.vel*Math.sqrt(this.vel.x**2 + this.vel.y**2), Math.atan2(this.vel.y, this.vel.x));
    }
    updatePosition(){
        //position = velocity * time resolution
        this.x += this.vel.x * dt;
        this.y += this.vel.y * dt;
    }
}


//default view of the solar system
let planets = new Set([new planet(384.4+myCanvas.width/2 + 147210, 200, 7.34, "#808080", 1, {x: 0, y: 31.022}), new planet(myCanvas.width/2 + 147210, 200, 597.2, "#34eb5f", 1, {x: 0, y: 30}, {x: 0, y: 0}), new planet(myCanvas.width/2, 200, 198900000, "#f5d142", 1, {x: 0, y: 0}, {x: 0, y: 0})]);
let memoryPlanets = new Set();

backupPlanets();

//let planets = [new planet(384.4+myCanvas.width/2, 200, 7.34, "#6e6e6e", {x: 0, y: 1.022}), new planet(myCanvas.width/2, 200, 597.2, "#34eb5f", {x: 0, y: 0})];

//start simulation
setInterval(sim, 1000/60);
function sim(){
    ctx.clearRect(0, 0, myCanvas.width, myCanvas.height);
    //draw buttons over planets if clicked
    if(planetOverlay != -1){
        if(scale.truesize != 2){
            ctx.fillStyle = "white";
            ctx.fillRect(centerScale(planetOverlay.x,0) - 10, centerScale(planetOverlay.y,1) - Math.sqrt(1/scale.general)*400, 20, 20);
            ctx.fillStyle = "black";
            ctx.fillText("X", centerScale(planetOverlay.x,0) - 3, centerScale(planetOverlay.y,1) - Math.sqrt(1/scale.general)*400 + 14);
        }
        else {
            ctx.fillStyle = "white";
            ctx.fillRect(centerScale(planetOverlay.x,0) - 10, centerScale(planetOverlay.y,1) - 70, 20, 20);
            ctx.fillStyle = "black";
            ctx.fillText("X", centerScale(planetOverlay.x,0) - 3, centerScale(planetOverlay.y,1) - 70 + 14);
        }
    }
    //anchor cross for reference
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.fillRect(anchor.x, anchor.y, 10, 1);
    ctx.fillRect(anchor.x + 4.5, anchor.y - 4.5, 1, 10);
    //draw planets
    for(let p of planets){
        if(p.mass != 0){
            p.updateAcceleration();
            p.updateVelocity();
            p.updatePosition();
            draw(p);
        }
    }
    //draw background for preview
    if(mode == 0) ctx.fillStyle = "#121639";
    else ctx.fillStyle = "#080a1c";
    ctx.fillRect(myCanvas.width*0.7, myCanvas.height/3, myCanvas.width*0.3, myCanvas.height/3);
    ctx.fillStyle = "#616480";
    ctx.fillRect(myCanvas.width*0.7, myCanvas.height/3, 3, myCanvas.height/3)
    //draw preview object
    if(drawpr){
        drawPre();
    }
    drawScale();
}

function draw(obj){ //draw object on canvas
    ctx.fillStyle = obj.color;
    switch(scale.truesize){
        case 0:
            //actual scale
            ctx.beginPath();
            ctx.arc(centerScale(obj.x, 0), centerScale(obj.y, 1), Math.cbrt(obj.mass)*0.7562235/scale.general, 0, 2*Math.PI);
            ctx.fill();
        break;
        case 1: 
            //normal scale
            ctx.beginPath();
            ctx.arc(centerScale(obj.x, 0), centerScale(obj.y, 1), Math.cbrt(obj.mass)*1.1*scale.planet/scale.general, 0, 2*Math.PI);
            ctx.fill();
        break;
        case 2:
            //equal scale
            if(mode == 1) ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.arc(centerScale(obj.x, 0), centerScale(obj.y, 1), scale.planet*20, 0, 2*Math.PI);
            ctx.fill();
            if(mode == 1){
                //visual + or - based on the sign of the charged object
                switch(obj.sign){
                    case 1:
                        ctx.fillStyle = "black";
                        ctx.fillRect(centerScale(obj.x, 0) - scale.planet*15, centerScale(obj.y, 1) - scale.planet*4,
                        scale.planet*30, scale.planet*8);
                        ctx.fillRect(centerScale(obj.x, 0) - scale.planet*4, centerScale(obj.y, 1) - scale.planet*15,
                        scale.planet*8, scale.planet*30);
                    break;
                    case -1:
                        ctx.fillStyle = "black";
                        ctx.fillRect(centerScale(obj.x, 0) - scale.planet*15, centerScale(obj.y, 1) - scale.planet*4,
                        scale.planet*30, scale.planet*8);
                    break;
                }
            }
        break;
    }
}

function drawScale(){
    ctx.fillStyle = "white";
    ctx.fillRect(15, 15, 200, 3);
    ctx.fillRect(15, 10, 3, 13);

    //algorithm for drawing the scale strip with different units
    let strips = 3;
    let actualLength = (10**6)*200*scale.general;
    let magpow = Math.floor(Math.log10(actualLength)-1);
    let magnitude = Math.pow(10, magpow);
    let dx = Math.floor(actualLength/(strips * magnitude))*magnitude;

    //different units depending on the scaling
    if(mode == 0){
        if(magpow < 3) ctx.fillText(Math.floor(dx/magnitude)/10 + "E" + (magpow+1) + " (m)", 25, 30);
        else if (magpow < 9) ctx.fillText(Math.floor(dx/magnitude)/10 + "E" + (magpow-2) + " (km)", 25, 30);
        else if(magpow == 9) ctx.fillText(Math.floor(((Math.floor(dx/magnitude)/100)/(1.495978707))*100)/100 + " (AU)", 25, 30);
        else if(magpow == 10) ctx.fillText(Math.floor(((Math.floor(dx/magnitude)/100)/(1.495978707))*1000)/100 + " (AU)", 25, 30);
        else ctx.fillText(Math.floor(((Math.floor(dx/magnitude)/100)/(1.495978707))*1000)/100 + "E" + (magpow-10) + " (AU)", 25, 30);
    }
    else {
        if (magpow < 6) ctx.fillText(Math.floor(dx/magnitude)/10 + "E" + (magpow-2) + " (pm)", 25, 30);
        else ctx.fillText(Math.floor(dx/magnitude)/10 + "E" + (magpow-5) + " (nm)", 25, 30);
    }

    //strip divisions
    ctx.fillRect(15 + (dx/scale.general)/(10**6), 10, 3, 13);
    ctx.fillRect(15 + (2*dx/scale.general)/(10**6), 10, 3, 13);
}

function drawArrow(x1, y1, power, alpha){
    //arrow drawing
    ctx.strokeStyle = "white";
    ctx.lineWidth = 0.3;
    ctx.beginPath();
    ctx.moveTo(centerScale(x1, 0), centerScale(y1, 1));
    ctx.lineTo(centerScale(power*Math.cos(alpha) + x1, 0), centerScale(power*Math.sin(alpha) + y1, 1));
    ctx.stroke();
}


function centerScale(c, mode){
    //shifts x or y value by anchor (which is modified by dragging the mouse), scales, then adds anchor back
    return mode == 0 ? ((c-anchor.x/scale.general)/scale.general + anchor.x) : ((c-anchor.y/(scale.general))/scale.general) + anchor.y;
}
function inverseCenterScale(c, mode){
    //reverse operation of centerScale()
    return mode == 0 ? (c - anchor.x)*(scale.general) + anchor.x/(scale.general): (c - anchor.y)*(scale.general) + anchor.y/(scale.general);
}

function drawPre(){
    //preview object drawing
    if(mode == 0){
        //same algorithm as the simulation objects
        ctx.fillStyle = previewObj.color;
        ctx.beginPath();
        if(scale.truesize == 1 || scale.truesize == 0){
            ctx.arc(previewObj.x, previewObj.y, Math.cbrt(previewObj.mass)*scale.planet/scale.general, 0, 2*Math.PI);
        } else {
            ctx.arc(previewObj.x, previewObj.y, scale.planet*20, 0, 2*Math.PI);
        }
        ctx.fill();
    }
    else {
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(previewObj.x, previewObj.y , scale.planet*20, 0, 2*Math.PI);
        ctx.fill();
        if(mode == 1){
            //visual + or - based on the sign of the charged object
            switch(previewObj.sign){
                case 1:
                    ctx.fillStyle = "black";
                    ctx.fillRect(previewObj.x - scale.planet*15, previewObj.y - scale.planet*4,
                    scale.planet*30, scale.planet*8);
                    ctx.fillRect(previewObj.x - scale.planet*4, previewObj.y - scale.planet*15,
                    scale.planet*8, scale.planet*30);
                break;
                case -1:
                    ctx.fillStyle = "black";
                    ctx.fillRect(previewObj.x - scale.planet*15, previewObj.y - scale.planet*4,
                    scale.planet*30, scale.planet*8);
                break;
            }
        }
    }
}

function timechange(){
    //time scale visual representation, resolution
    dt = (document.getElementById("time").value/1000)**5;
    let res = 100;
    if(dt > 3) res = 1000;
    if(dt < 0.1) res = 10;
    if(dt < 0.007) res = 1;
    document.getElementById("timetext").innerHTML = (Math.floor((66391.5789474*dt + 0.4)/res)*res)+"x"
}

document.getElementById("inp").addEventListener("change", () => {
    //default values for previewobject
    let val = inp.value;
    if(Number.isInteger(+val) && val != "0"){
        drawpr = true;
        previewObj = {
            x: myCanvas.width*0.85,
            y: myCanvas.height/3 + myCanvas.height/6,
            mass: Number(inp.value),
            sign: document.getElementById("signchanger").innerHTML == "+" ? 1 : -1,
            color: "#eb3434"
        };
    }
    else {
        inp.value = "";
    }
});

function backupPlanets(){ //backs up to planetsS
    memoryPlanets = new Set();
    for(let p of planets) memoryPlanets.add(new planet(p.x, p.y, p.mass, p.color, p.sign, {x: p.vel.x, y:p.vel.y}, {x: p.acc.x, y:p.acc.y}));
}

function returnBackupPlanets(){
    planets = new Set();
    for(let p of memoryPlanets) planets.add(new planet(p.x, p.y, p.mass, p.color, p.sign, {x: p.vel.x, y:p.vel.y}, {x: p.acc.x, y:p.acc.y}));
}

function movems(e){
    //dragging algorithm for preview
    if(dragpt){
        previewObj.x = (e.clientX) - ms.dx;
        previewObj.y = (e.clientY) - ms.dy;
    }
    //dragging algorithm for canvas
    else if(dragview){
        anchor.x = e.clientX - ms.dxv;
        anchor.y = e.clientY - ms.dyv;
    }
    else {
    //values for where to zoom in/out
        scale.anchor.tx = e.clientX;
        scale.anchor.ty = e.clientY;
    }
}

function msup(e){
    dragview = false;
    //check if the preview object is released onto canvas
    if(dragpt && drawpr && previewObj.mass != 0 && previewObj.x < myCanvas.width*0.7 && previewObj.y < myCanvas.height){
        planets.add(new planet(
        inverseCenterScale(previewObj.x, 0), 
        inverseCenterScale(previewObj.y, 1),
        Number(previewObj.mass), previewObj.color, previewObj.sign, 
        {x: vxinp.value ? Number(vxinp.value) : 0, y: vyinp.value ? Number(vyinp.value) : 0}));
        backupPlanets();
        vxinp.value = "";
        vyinp.value = "";
        inp.value = "";
        document.getElementById("signchanger").innerHTML = "+";
        previewObj.mass = 0;
        previewObj.sign = 1;
        drawpr = false;
        dragpt = false;
    }
    else {
        //check if any planet was just pressed
        if(planetOverlay == -1){
            for(let p of planets){
                if(mouseCollidePlanet(p, e.clientX, e.clientY)){
                    planetOverlay = p;
                }
            }
        }
    }
}

function mouseCollidePlanet(obj, mx, my){ //checks if mouse pressed on planet
    let rad;
    switch(scale.truesize){//different scales
        case 0:
            rad = Math.cbrt(obj.mass)*0.7562235/scale.general;
        break;
        case 1: 
            rad = Math.cbrt(obj.mass)*1.1*scale.planet/scale.general;
        break;
        case 2:
            rad = scale.planet*20;
        break;
    }
    //if less delta is than radius then has pressed (approximately)
    if(Math.abs(centerScale(obj.x, 0) - mx) <= rad && Math.abs(centerScale(obj.y, 1) - my) <= rad) return true;
    else return false;
}

function msdwn(e){
    //check if the preview object is about to be dragged
    if(previewObj.mass != 0 && e.clientX >= myCanvas.width*0.7 && 
        (scale.truesize != 2 && Math.sqrt((e.clientX - previewObj.x)**2 + (e.clientY - previewObj.y)**2) - 20 <= Math.cbrt(previewObj.mass)) ||
        (scale.truesize == 2 && Math.sqrt((e.clientX - previewObj.x)**2 + (e.clientY - previewObj.y)**2) <= scale.planet*20)){
        dragpt = true;
        drawpr = true;
        dragview = false;
        ms.dx = -previewObj.x + (e.clientX);
        ms.dy = -previewObj.y + (e.clientY);
        planetOverlay = -1;
    }
    //check if the screen object is about to be dragged
    else if(!dragpt && e.clientX < myCanvas.width*0.7) {
        //check if the delete button is pressed
        if(planetOverlay != -1){
            if(scale.truesize != 2 
                && e.clientX > centerScale(planetOverlay.x,0) - 10
                && e.clientX < centerScale(planetOverlay.x,0) + 10
                && e.clientY > centerScale(planetOverlay.y,1) - Math.sqrt(1/scale.general)*400
                && e.clientY < centerScale(planetOverlay.y,1) - Math.sqrt(1/scale.general)*400 + 20
            ){
                planets.delete(planetOverlay);
            }
            else if(
                e.clientX > centerScale(planetOverlay.x,0) - 10
                && e.clientX < centerScale(planetOverlay.x,0) + 10
                && e.clientY > centerScale(planetOverlay.y,1) - 70
                && e.clientY < centerScale(planetOverlay.y,1) - 70 + 20
            ){
                planets.delete(planetOverlay);
            }
            planetOverlay = -1;
        }
        //drag screen
        dragview = true;
        ms.dxv = (-anchor.x + (e.clientX));
        ms.dyv = (-anchor.y + (e.clientY));
    }
}

//listeners for mouse actions
document.getElementById("myCanvas").addEventListener("mousemove", movems);
document.getElementById("myCanvas").addEventListener("mouseup", msup);
document.getElementById("myCanvas").addEventListener("mousedown", msdwn);

//key stroke control
document.addEventListener("keydown", (e) => {
    switch(e.key){
        case "=":
            zoom(true);
        break;
        case "k":
            planets.clear();
        break;
        case "-":
            zoom(false);
        break;
        case " ":
            pausegame();
        break;
        case "z":
            scale.general = 1.23;
        break;
        case "r":
            returnBackupPlanets();
        break;
    }
});

//zoom simulation function
function zoom(inzoom){
    scale.anchor.x = scale.anchor.tx;
    scale.anchor.y = scale.anchor.ty;
    if(inzoom){//zoom in calculation based on the position of the cursor
        anchor.x += (anchor.x - scale.anchor.x)*1.2 - (anchor.x - scale.anchor.x);
        anchor.y += (anchor.y - scale.anchor.y)*1.2 - (anchor.y - scale.anchor.y);
        scale.general /= 1.2;
    }
    else {//zoom out calculation based on the position of the cursor
        anchor.x += (anchor.x - scale.anchor.x)/1.2 - (anchor.x - scale.anchor.x);
        anchor.y += (anchor.y - scale.anchor.y)/1.2 - (anchor.y - scale.anchor.y);
        scale.general *= 1.2;
    }
}

//pause game -> stop the time flow, and remember the time speed
function pausegame(){
    document.getElementById("play").innerHTML = document.getElementById("play").innerHTML == "PLAY" ? "PAUSE" : "PLAY";
    document.getElementById("play").style.backgroundColor = document.getElementById("play").innerHTML == "PLAY" ? "#77EC98" : "#ec7777";
    if(dt == 0) dt = dtmemory;
    else {
        dtmemory = dt;
        dt = 0;
    }
}

//events for switching the view type
document.getElementById("actualsize").onclick = () => {
    if(mode == 0){
        scale.truesize = 0;
        document.getElementById("actualsize").style.backgroundColor = "rgba(255, 255, 255, 0.4)";
        document.getElementById("scaledsize").style.backgroundColor = "rgba(255, 255, 255, 0.2)";
        document.getElementById("normalizedsize").style.backgroundColor = "rgba(255, 255, 255, 0.2)";
    }
}
document.getElementById("scaledsize").onclick = () => {
    if(mode == 0){
        scale.truesize = 1;
        document.getElementById("actualsize").style.backgroundColor = "rgba(255, 255, 255, 0.2)";
        document.getElementById("scaledsize").style.backgroundColor = "rgba(255, 255, 255, 0.4)";
        document.getElementById("normalizedsize").style.backgroundColor = "rgba(255, 255, 255, 0.2)";
    }
}
document.getElementById("normalizedsize").onclick = () => {
    scale.truesize = 2;
    document.getElementById("actualsize").style.backgroundColor = "rgba(255, 255, 255, 0.2)";
    document.getElementById("scaledsize").style.backgroundColor = "rgba(255, 255, 255, 0.2)";
    document.getElementById("normalizedsize").style.backgroundColor = "rgba(255, 255, 255, 0.4)";
}

//sign change for new object
document.getElementById("signchanger").onclick = () => {
    if(mode == 1){
        document.getElementById("signchanger").innerHTML = document.getElementById("signchanger").innerHTML == "+" ? "-" : "+";
        previewObj.sign = -previewObj.sign;
    }
}

//velocity and acceleration vector visual
document.getElementById("velchanger").onclick = () => {
    document.getElementById("velchanger").innerHTML = document.getElementById("velchanger").innerHTML == "+" ? "-" : "+";
    showvel = !showvel;
}
document.getElementById("accchanger").onclick = () => {
    document.getElementById("accchanger").innerHTML = document.getElementById("accchanger").innerHTML == "+" ? "-" : "+";
    showacc = !showacc;
}

//play/pause
document.getElementById("play").onclick = () => {
    pausegame();
}

//switch between the two modes
document.getElementById("astroem").onclick = () => {
    //only convert if there are a maximum of two objects - otherwise there are issues with the way charged signs should be treated
    if(planets.size <= 2){
        switch (mode) {
            case 0:
                scale.truesize = 2;
                for(let p of planets){
                    if(p.sign == 1) {
                        p.sign = -1;
                        break;
                    }
                }
                document.getElementById("actualsize").style.backgroundColor = "rgba(255, 255, 255, 0.2)";
                document.getElementById("scaledsize").style.backgroundColor = "rgba(255, 255, 255, 0.2)";
                document.getElementById("normalizedsize").style.backgroundColor = "rgba(255, 255, 255, 0.4)";

                document.getElementById("astroem").innerHTML = "ELECTRO-MAGNETISM";

                document.getElementById("inp").placeholder = "(10^-19 C)";

                document.getElementsByClassName("signtext")[0].style.opacity = 1;
                document.getElementsByClassName("signtext")[1].style.opacity = 1;

                document.getElementById("mch").innerHTML = "CHARGE";

                document.body.style.backgroundColor = "#080a1c";

                scale.planet = 0.8;
                
                mode = 1;
            break;
            case 1:
                for(let p of planets) p.sign = 1;

                scale.truesize = 1;

                document.getElementById("actualsize").style.backgroundColor = "rgba(255, 255, 255, 0.2)";
                document.getElementById("scaledsize").style.backgroundColor = "rgba(255, 255, 255, 0.4)";
                document.getElementById("normalizedsize").style.backgroundColor = "rgba(255, 255, 255, 0.2)"; 

                document.getElementById("astroem").innerHTML = "ASTRONOMY";

                document.getElementById("inp").placeholder = "(10^22 kg)"; 
                
                document.getElementsByClassName("signtext")[0].style.opacity = 0.4;
                document.getElementsByClassName("signtext")[1].style.opacity = 0.4;
                
                document.getElementById("mch").innerHTML = "MASS";

                document.body.style.backgroundColor = "#121639";

                scale.planet = 2;

                mode = 0;
        break;
        }
    }
    else alert("Too many objects to convert! A maximum of two");
}

setTimeout(transbody, 1000);
function transbody (){
    document.body.style.transitionDuration = "1s";
}