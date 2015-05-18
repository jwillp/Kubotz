package com.brm.Kubotz.Scripts;

import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityContact;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.Scripts.EntityScript;
import com.brm.GoatEngine.Input.VirtualButton;
import com.brm.GoatEngine.Utils.Logger;

import java.util.ArrayList;

/**
 * Just a Test Script
 */
public class TestScript extends EntityScript {
    @Override
    public void onInit(Entity entity, EntityManager manager) {
        Logger.log("SCRIPT WAS ATTACHED");
    }

    @Override
    public void onUpdate(Entity entity, EntityManager manager) {

    }

    @Override
    public void onInput(Entity entity, EntityManager manager, ArrayList<VirtualButton> pressedButtons) {
        Logger.log(pressedButtons);
    }

    @Override
    public void onCollision(EntityContact contact) {
        Logger.log("MY ENTITY HAD A CONTACT");
    }

    @Override
    public void onDetach(Entity entity, EntityManager manager) {

    }
}
