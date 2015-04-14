package com.brm.Kubotz.AI.KubotzBehaviours;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.AI.BehaviourTree.Node;
import com.brm.GoatEngine.AI.BehaviourTree.Selector;
import com.brm.GoatEngine.AI.BehaviourTree.Sequence;
import com.brm.GoatEngine.ECS.Components.HealthComponent;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.Utils.GameMath.Vectors;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.AI.KubotzPathFinder;
import com.brm.Kubotz.Constants;
import com.brm.Kubotz.Input.GameButton;

import java.util.ArrayList;
import java.util.Hashtable;

/**
 * The Behaviour tree nodes for a KubotzBehaviour
 */
public class KubotzBehaviour extends Selector{


    /**
     * Builds a Kubotz behaviour tree
     * @param em the Entity Manager
     * @param agent the agent of the tree
     */
    public KubotzBehaviour(EntityManager em, Entity agent, KubotzPathFinder pathfinder){
        this.blackBoard.put("entityManager", em);
        this.blackBoard.put("agent", agent);
        this.blackBoard.put("pathfinder", pathfinder);

        this.buildTree();

    }


    public void buildTree(){
        this.children.clear();
        //PASSIVE
        this.addNode(new PassiveBehaviour(this.blackBoard)
                        //Avoid Combat
                        .addNode(new Sequence(this.blackBoard)
                                .addNode(new LocateNearestEnnemy(this.blackBoard))
                                .addNode(new FleeBehaviour(this.blackBoard)
                                        .addNode(new CalculateFleeDestination(this.blackBoard))
                                        .addNode(new MoveToDestination(this.blackBoard))
                                        .addNode(new StopAtDestination(this.blackBoard))
                                )
                        )

                        //Heal
                        /*.addNode(new Sequence(this.blackBoard)
                                        .addNode(new LocateNearestHealthBonus(this.blackBoard))
                                        .addNode(new MoveToDestination(this.blackBoard))
                                        .addNode(new TakeObject(this.blackBoard))
                        )*/
        );





    }

    public class PassiveBehaviour extends Selector{
        public PassiveBehaviour(Hashtable<String, Object> blackBoard) {
            super(blackBoard);
        }

        @Override
        public boolean precondition() {
            float health = ((HealthComponent)((Entity)this.blackBoard.get("agent"))
                    .getComponent(HealthComponent.ID)).getAmount();
            return !(health <= 25);
        }
    }


    /**
     * Finds the nearest enemy in the map
     */
    public class LocateNearestEnnemy extends Node{

        public LocateNearestEnnemy(Hashtable<String, Object> blackBoard) {
            super(blackBoard);
        }

        @Override
        public State update() {
            Logger.log("LOCATE");
            EntityManager em = (EntityManager) this.blackBoard.get("entityManager");



            PhysicsComponent myPhys = (PhysicsComponent)((Entity)this.blackBoard.get("agent"))
                                        .getComponent(PhysicsComponent.ID);

            int smallestDistance = Integer.MAX_VALUE;

            for(Entity entity: em.getEntitiesWithTag(Constants.ENTITY_TAG_KUBOTZ)){

                PhysicsComponent enemyPhys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);

                int dist = Vectors.manhattanDistance(enemyPhys.getPosition(), myPhys.getPosition());

                if(dist <= smallestDistance && dist != 0){
                    smallestDistance = dist;
                    this.blackBoard.put("enemy", entity);
                }
            }

            Logger.log(smallestDistance);


            if(smallestDistance == Integer.MAX_VALUE){
                return State.FAILED;
            }

            return State.SUCCESS;
        }
    }


    /**
     * Calculates a destination far enough from the enemy
     */
    public class CalculateFleeDestination extends Node{

        public CalculateFleeDestination(Hashtable<String, Object> blackBoard) {
            super(blackBoard);
        }

        @Override
        public State update() {
            Logger.log("CALCULATE");

            Entity enemy = (Entity) this.blackBoard.get("enemy");
            PhysicsComponent phys = (PhysicsComponent) enemy.getComponent(PhysicsComponent.ID);
            this.blackBoard.put("destination", phys.getPosition());


            return State.SUCCESS;
        }
    }

    /**
     * Flee behaviour
     */
    public class FleeBehaviour extends Sequence{

        public FleeBehaviour(Hashtable<String, Object> blackBoard) {
            super(blackBoard);
        }

        /**
         * If distance between kubotz and enemy smaller than 5 meters
         * @return
         */
        @Override
        public boolean precondition() {
            return super.precondition();
        }
    }



    /**
     * Moves towards a destination
     */
    public class MoveToDestination extends Node{

        public MoveToDestination(Hashtable<String, Object> blackBoard) {
            super(blackBoard);
        }

        @Override
        public boolean precondition() {
            return this.blackBoard.get("destination") != null;
        }

        @Override
        public State update() {

            Logger.log("MOOVE");


            //Kubotz
            Entity kubotz = (Entity) this.blackBoard.get("agent");
            PhysicsComponent phys = (PhysicsComponent) kubotz.getComponent(PhysicsComponent.ID);


            // Determine path with pathfinder
            KubotzPathFinder pathfinder = (KubotzPathFinder)this.blackBoard.get("pathfinder");
            ArrayList<com.brm.GoatEngine.AI.Pathfinding.Node> path = pathfinder.findPath(
                    phys.getPosition(),
                    (Vector2) this.blackBoard.get("destination")
            );


            // Move in the direction of the destination
            if(!path.isEmpty()){
                //if(false){
                VirtualGamePad gamePad = (VirtualGamePad) kubotz.getComponent(VirtualGamePad.ID);
                com.brm.GoatEngine.AI.Pathfinding.Node node = path.get(0);
                Vector2 pos = node.position;

                //LEFT OF
                if (phys.getPosition().x < pos.x ){
                    gamePad.releaseButton(GameButton.MOVE_LEFT);
                    gamePad.pressButton(GameButton.MOVE_RIGHT);
                }else if (phys.getPosition().x > pos.x ){  // RIGHT OF
                    gamePad.releaseButton(GameButton.MOVE_RIGHT);
                    gamePad.pressButton(GameButton.MOVE_LEFT);
                }else{ //Release
                    gamePad.releaseButton(GameButton.MOVE_RIGHT);
                    gamePad.releaseButton(GameButton.MOVE_LEFT);
                }

                //Speed dash
                if(node.isLedge && node.position.x == phys.getPosition().x){
                    gamePad.pressButton(GameButton.ACTIVE_SKILL_BUTTON);
                }


                if (phys.getPosition().y < pos.y ){
                    gamePad.pressButton(GameButton.MOVE_UP);
                }else{
                    gamePad.releaseButton(GameButton.MOVE_UP);
                    //gamePad.pressButton(GameButton.MOVE_DOWN);
                }
            }

            return State.SUCCESS;
        }


    }














    /**
     * Stops at destination
     */
    public class StopAtDestination extends Node{

        public StopAtDestination(Hashtable<String, Object> blackBoard) {
            super(blackBoard);
        }

        @Override
        public State update() {
            Logger.log("STOP");
            //this.blackBoard.remove("destination");
            return State.SUCCESS;
        }
    }


    /**
     * Finds the nearest health bonus object in order to heal
     */
    public class LocateNearestHealthBonus extends Node{

        public LocateNearestHealthBonus(Hashtable<String, Object> blackBoard) {
            super(blackBoard);
        }

        @Override
        public State update() {
            return null;
        }
    }


    /**
     * Takes an object
     */
    public class TakeObject extends Node{

        public TakeObject(Hashtable<String, Object> blackBoard) {
            super(blackBoard);
        }

        @Override
        public State update() {
            return null;
        }
    }




    public class ActiveBehaviour extends Selector{
        @Override
        public boolean precondition() {
            return (Integer)this.blackBoard.get("health") <= 25;
        }
    }


    /**
     * Attacks an enemy with a ranged weapon
     */
    public class AttackWithRangeWeapon extends Node{

        @Override
        public State update() {
            return null;
        }
    }

    /**
     * Attacks an enemy with a melee weapon
     */
    public class AttackWithMeleeWeapon extends Node{

        @Override
        public State update() {
            return null;
        }
    }






}


