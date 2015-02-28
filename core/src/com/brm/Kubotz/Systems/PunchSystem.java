package com.brm.Kubotz.Systems;

import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.EntityManager;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.Kubotz.Component.PunchComponent;
import com.brm.Kubotz.Input.GameButton;

/**
 * Used to handle the entities punching
 */
public class PunchSystem extends EntitySystem{

    public PunchSystem(EntityManager em) {
        super(em);
    }


    @Override
    public void handleInput() {

        for(Entity entity: em.getEntitiesWithComponent(PunchComponent.ID)){
            VirtualGamePad gamePad = (VirtualGamePad) entity.getComponent(VirtualGamePad.ID);
            PunchComponent punchComponent = (PunchComponent)entity.getComponent(PunchComponent.ID);

            if(gamePad.isButtonPressed(GameButton.PUNCH_BUTTON)){
              if(punchComponent.cooldown.isDone()){
                  punchComponent.showAttackBox();
                  punchComponent.durationTimer.reset();
              }
            }
        }

    }



    public void update() {
        for(Entity entity: em.getEntitiesWithComponent(PunchComponent.ID)){
            PunchComponent punchComponent = (PunchComponent)entity.getComponent(PunchComponent.ID);

                if(punchComponent.durationTimer.isDone() && punchComponent.punchFixture != null){
                   punchComponent.hideAttackBox();
                    punchComponent.cooldown.reset();
                }
        }

    }
}

