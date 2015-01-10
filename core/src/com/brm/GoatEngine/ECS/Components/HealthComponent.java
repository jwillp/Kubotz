package com.brm.GoatEngine.ECS.Components;

import com.brm.GoatEngine.ECS.Components.Component;

/**
 * Created by Home on 2014-12-24.
 */
public class HealthComponent extends Component {

    public final static String ID = "HEALTH_PROPERTY";

    private int amount = 0;

    public HealthComponent(){}

    public int getAmount(){
        return this.amount;
    }

    public void setAmount(int newAmount){
        this.amount = newAmount;
    }


    public void addAmount(int amount){
        this.amount += amount;
    }

    public void substractAmount(int amount){
        this.amount -= amount;
    }


}
