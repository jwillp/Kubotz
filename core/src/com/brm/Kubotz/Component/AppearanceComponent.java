package com.brm.Kubotz.Component;

import com.badlogic.gdx.graphics.Color;
import com.brm.GoatEngine.ECS.Components.Component;

/**
 * Created by Home on 2014-12-25.
 */
public class AppearanceComponent extends Component {

    public static String ID = "APPEARANCE_PROPERTY";

    private Color debugColor; //Used during debug rendering


    public Color getDebugColor() {
        return debugColor;
    }

    public void setDebugColor(Color debugColor) {
        this.debugColor = debugColor;
    }
}
