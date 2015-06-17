// Main entry point



obj = {

	init: function (engine) {
		// body...
	},
       
    handleInput: function (engine) {
    	// body...
    },

    update: function (engine, deltaTime) {
    	// body...
    },

    draw: function (engine, deltaTime) {
    	// body...
    }

 };


var j = new JavaAdapter(com.brm.GoatEngine.ScreenManager.GameScreen, obj);


GoatEngine.getGameScreenManager().changeScreen(j);