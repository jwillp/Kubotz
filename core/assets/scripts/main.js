// Main entry point

//A very simple class wrapper used to simplyfy Javascript OOP
var Class = {
    extend: function (type, objectDef) {
        return new JavaAdapter(type, objectDef);
    },

    create: function (objectDef) {
       objectDef.extend = this.extend; //Add the possibility to extend to a class
       return objectDef;
    },
};


/**
* Simple Enums
*/
function Enum(constantsList){
    enumObj = {}
    for (var i in constantsList) {
        enumObj[constantsList[i]] = i;
    }
    Object.freeze(enumObj);
    return enumObj;
};



var Direction = Enum(['NORTH', 'SOUTH', 'WEST', 'EAST']);




/**var screen = Class.extend(ScreenManagerPackage.GameScreen, {

    a: 0,


    init: function (engine) {
        // body...
    },
       
    handleInput: function (engine) {
        // body...
    },

    update: function (engine, deltaTime) {
        var entity = GoatEngine.getCurrentScreen().getEntityManager().createEntity();
        console.log("Entity count: " + GoatEngine.getCurrentScreen().getEntityManager().getEntityCount());


    },

    draw: function (engine, deltaTime) {
        // body...
    }

});*/
//GoatEngine.getGameScreenManager().changeScreen(screen);

//GoatEngine.gameScreenManager.changeScreen(new com.brm.Kubotz.GameScreens.SplashScreen());
