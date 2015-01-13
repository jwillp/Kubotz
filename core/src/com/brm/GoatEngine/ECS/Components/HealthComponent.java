package com.brm.GoatEngine.ECS.Components;

public class HealthComponent extends Component {

    public final static String ID = "HEALTH_PROPERTY";

    private int amount = 0;
    public float maxHealth = 100;

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
