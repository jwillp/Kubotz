package com.brm.Kubotz.Component.Skills;

import com.brm.GoatEngine.Utils.Timer;

/**
 * Magnetic Feet
 */
public class MagneticFeetComponent extends DurationBasedSkill {
    public static final String ID = "MAGNETIC_FIELD";

    public float startingAngle; //In DEGREE

    public MagneticFeetComponent() {
        super(0, 0);
        this.setEnabled(false);
    }

    public Timer getRotationTimer(){
        return this.effectDurationTimer;
    }



}
