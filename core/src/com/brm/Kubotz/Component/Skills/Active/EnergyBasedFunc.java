package com.brm.Kubotz.Component.Skills.Active;

import com.brm.GoatEngine.Utils.Timer;
import com.brm.Kubotz.Component.Skills.Functionality;


public class EnergyBasedFunc extends Functionality {

    public final int ENERY_COST = 10; //energy cost per second

    protected Timer energyTimer; //A timer used to limit the energy consumption to once per second

    public EnergyBasedFunc(){

    }




}
