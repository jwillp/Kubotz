package com.brm.Kubotz.Component.Parts;

import com.brm.GoatEngine.Utils.Timer;
import com.brm.Kubotz.Component.Skills.DurationBasedSkill;

/**
 * Boots giving a Kubotz the ability to reverse the effect of gravity on itself
 */
public class MagneticBootsComponent extends DurationBasedSkill {
    public static final String ID = "MAGNETIC_FIELD";

    public float startingAngle; //In DEGREE

    public MagneticBootsComponent() {
        super(0, 0);
        this.setEnabled(false);
    }

    public Timer getRotationTimer(){
        return this.effectDurationTimer;
    }


}
