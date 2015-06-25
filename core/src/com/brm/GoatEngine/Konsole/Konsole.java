package com.brm.GoatEngine.Konsole;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.Color;
import com.strongjoshua.console.Console;

import java.util.ArrayList;

/**
 * A custom Konsole with some more functionalities
 */
public class Konsole extends Console {

    public Konsole(){
        super();
        this.setSize(Gdx.graphics.getWidth(), Gdx.graphics.getHeight()/4);
        this.setPosition(0,Gdx.graphics.getHeight());
    }




    // a list of custom commands (to be specified by javascript
    public ArrayList<String> commands = new ArrayList<String>();


    /**
     * Changes the opacity of the console
     * @param alpha
     */
    public void setOpacity(float alpha){
        Color c = this.consoleWindow.getColor();
        this.consoleWindow.setColor(c.r, c.b, c.b, alpha);
    }

    /**
     * Logs a certain string, can specify logLevel using a string
     * useful for Javascript
     * @param msg
     * @param levelString
     */
    public <T> void log(T msg, String levelString){
        this.log(msg.toString(), LogLevel.valueOf(levelString));
    }

}
