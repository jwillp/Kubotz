package com.brm.Kubotz.Properties;

import com.badlogic.gdx.graphics.Color;
import com.brm.GoatEngine.ECS.Properties.Property;

/**
 * Created by Home on 2014-12-25.
 */
public class AppearanceProperty extends Property {

    public static String ID = "APPEARANCE_PROPERTY";

    private Color debugColor; //Used during debug rendering


    public Color getDebugColor() {
        return debugColor;
    }

    public void setDebugColor(Color debugColor) {
        this.debugColor = debugColor;
    }
}
