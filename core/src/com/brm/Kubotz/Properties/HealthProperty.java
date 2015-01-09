package com.brm.Kubotz.Properties;

import com.brm.GoatEngine.ECS.Properties.Property;

/**
 * Created by Home on 2014-12-24.
 */
public class HealthProperty extends Property {

    public final static String ID = "HEALTH_PROPERTY";

    private int amount = 0;

    public HealthProperty(){}

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
