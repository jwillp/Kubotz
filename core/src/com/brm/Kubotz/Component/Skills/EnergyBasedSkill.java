package com.brm.Kubotz.Component.Skills;

import com.brm.GoatEngine.Utils.Timer;
import com.brm.Kubotz.Component.Skills.ActiveSkill;


public abstract class EnergyBasedSkill extends ActiveSkill {

    public int energyCost; //energy cost per second

    protected Timer energyTimer = new Timer(1000); //A timer used to limit the energy consumption to once per second

    /**
     * CTOR
     * @param cooldownDelay : the delay of the cool down
     */
    public EnergyBasedSkill(int cooldownDelay){
        super(cooldownDelay);

    }

    /**
     * Returns the energy timer
     * @return
     */
    public Timer getEnergyTimer(){
        return this.energyTimer;
    }



}
