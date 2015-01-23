package com.brm.Kubotz.Component.Skills;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.Component;
import com.brm.GoatEngine.Utils.Timer;

/**
 * Used to dash a character
 */
public class DashComponent extends Component{
    public final static String ID = "DASH_COMPONENT";

    public Vector2 distance = new Vector2(4,4); // The distance in nb of game units a Dash is
    public Vector2 speed = new Vector2(250,2);    // The Speed of the das
    private Timer coolDownTimer = new Timer(Timer.ONE_SECOND);
    private Timer preparationTimer = new Timer(Timer.ONE_SECOND);

    public DashComponent(){
        coolDownTimer.start();
        preparationTimer.start();
        this.setEnabled(false);
    }


    public Timer getCoolDownTimer() {
        return coolDownTimer;
    }

    public Timer getPreparationTimer() {
        return preparationTimer;
    }
}
