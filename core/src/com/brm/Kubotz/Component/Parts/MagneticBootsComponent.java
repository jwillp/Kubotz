package com.brm.Kubotz.Component.Parts;

import com.brm.GoatEngine.ECS.Components.Component;
import com.brm.GoatEngine.Utils.Timer;

/**
 * Boots giving a Kubotz the ability to reverse the effect of gravity on itself
 */
public class MagneticBootsComponent extends Component {
    public static final String ID = "MAGNETIC_BOOTS_COMPONENT";

    public float startingAngle; //In DEGREE

    public MagneticBootsComponent() {
        this.setEnabled(false);
    }



}
