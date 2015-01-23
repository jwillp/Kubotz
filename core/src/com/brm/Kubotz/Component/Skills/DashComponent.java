package com.brm.Kubotz.Component.Skills;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.Component;
import com.brm.GoatEngine.Utils.Timer;

/**
 * Used to dash a character
 */
public class DashComponent extends Component{
    public final static String ID = "DASH_COMPONENT";

    public final static int LEFT = -1;
    public final static int RIGHT = 1;
    public final static int DOWN = -1;
    public final static int UP = 1;




    public Vector2 distance = new Vector2(10,10); // The distance in nb of game units a Dash is
    public Vector2 speed = new Vector2(100,25);    // The Speed of the Dash

    public Vector2 startPosition;   //The position of the entity at the beginning of the dash

    //The direction in which we are dashing
    // -1 <= x <= 1 ==> -1 == Left AND 1 == Right
    //-1 <= y <= 1 ==>  -1 == Down AND 1 == Up
    // 0 means static
    public Vector2 direction = new Vector2(0,0);



    private Timer coolDownTimer = new Timer(750);
    private Timer preparationTimer = new Timer(200);
    private Timer effectDurationTimer = new Timer(Timer.ONE_SECOND);


    public DashComponent(){
        coolDownTimer.start();
        preparationTimer.start();
        effectDurationTimer.start();

        this.setEnabled(false);
    }


    public Timer getCoolDownTimer() {
        return coolDownTimer;
    }

    public Timer getPreparationTimer() {
        return preparationTimer;
    }

    public Timer getEffectDurationTimer() {
        return effectDurationTimer;
    }
}
