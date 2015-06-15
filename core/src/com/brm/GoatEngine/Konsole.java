package com.brm.GoatEngine;

import com.badlogic.gdx.graphics.Color;
import com.strongjoshua.console.Console;

/**
 * A custom Konsole with some more functionalities
 */
public class Konsole extends Console {


    public void setOpacity(float alpha){
        Color c = this.consoleWindow.getColor();
        this.consoleWindow.setColor(c.r, c.b, c.b, alpha);
    }
}
