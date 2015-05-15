package com.brm.Kubotz.Component.Parts;

import com.brm.GoatEngine.ECS.Components.Component;
import com.brm.GoatEngine.Utils.Timer;

/**
 * Boots giving a Kubotz the ability to Dash
 */
public class DashBootsComponent extends Component{

    public Timer cooldown;       //The cool down between the uses of the boots
    public Timer effectDuration; //The duration of the boot's effect



}
