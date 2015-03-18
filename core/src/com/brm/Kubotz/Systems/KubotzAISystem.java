package com.brm.Kubotz.Systems;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.AI.Pathfinding.Node;
import com.brm.GoatEngine.AI.Pathfinding.Pathfinder;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.Kubotz.Component.AI.KubotzAIComponent;
import com.brm.Kubotz.Constants;
import com.brm.Kubotz.Input.GameButton;

import java.util.ArrayList;

/**
 * Use to process AI logic of Kubotz
 */
public class KubotzAISystem extends EntitySystem {


    public KubotzAISystem(EntityManager em) {
        super(em);
    }
    public Pathfinder pathfinder = new Pathfinder();

    public ArrayList<Node> path;

    public void update(){


        for(Entity eAI : em.getEntitiesWithComponent(KubotzAIComponent.ID)){



            PhysicsComponent aiPhys = (PhysicsComponent) eAI.getComponent(PhysicsComponent.ID);
            VirtualGamePad gamePad = (VirtualGamePad) eAI.getComponent(VirtualGamePad.ID);

            Entity player = em.getEntitiesWithTag("player").get(0);
            PhysicsComponent playerPhys = (PhysicsComponent) player.getComponent(PhysicsComponent.ID);

            path = pathfinder.findPath(aiPhys.getPosition(), playerPhys.getPosition());

            if(!path.isEmpty()){
            //if(false){

                    Vector2 pos = path.get(0).position;

                    //LEFT OF
                    if (aiPhys.getPosition().x < pos.x ){
                        gamePad.releaseButton(GameButton.MOVE_LEFT);
                        gamePad.pressButton(GameButton.MOVE_RIGHT);
                    }else if (aiPhys.getPosition().x > pos.x ){  // RIGHT OF
                        gamePad.releaseButton(GameButton.MOVE_RIGHT);
                        gamePad.pressButton(GameButton.MOVE_LEFT);
                    }else{
                        gamePad.releaseButton(GameButton.MOVE_RIGHT);
                        gamePad.releaseButton(GameButton.MOVE_LEFT);
                    }



                    if (aiPhys.getPosition().y < pos.y ){
                        gamePad.pressButton(GameButton.MOVE_UP);
                    }else{
                        gamePad.releaseButton(GameButton.MOVE_DOWN);
                    }
            }







        }





    }



}
